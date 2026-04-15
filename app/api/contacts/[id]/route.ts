import { store, geocodeCity } from '@/lib/store';

const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSupabase() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await getSupabase();
  if (sb) {
    const [{ data: contact, error }, { data: projects }] = await Promise.all([
      sb.from('contacts').select('*').eq('id', id).single(),
      sb.from('projects').select('*, phases:project_phases(*, checklist_items(*))').eq('contact_id', id).order('created_at', { ascending: false }),
    ]);
    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json({
      ...contact,
      projects: (projects || []).map((p: any) => ({
        ...p,
        phases: (p.phases || [])
          .sort((a: any, b: any) => a.phase_order - b.phase_order)
          .map((ph: any) => ({
            ...ph,
            checklist_items: (ph.checklist_items || []).sort((a: any, b: any) => a.item_order - b.item_order),
          })),
      })),
    });
  }
  const contact = store.getContact(id);
  if (!contact) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ...contact, projects: [] });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Re-geocode if city changed
  if (body.city && !body.lat) {
    const coords = await geocodeCity(body.city);
    if (coords) { body.lat = coords.lat; body.lng = coords.lng; }
  }

  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.from('contacts').update(body).eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }
  const updated = store.updateContact(id, body);
  if (!updated) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await getSupabase();
  if (sb) {
    const { error } = await sb.from('contacts').delete().eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return new Response(null, { status: 204 });
  }
  store.deleteContact(id);
  return new Response(null, { status: 204 });
}
