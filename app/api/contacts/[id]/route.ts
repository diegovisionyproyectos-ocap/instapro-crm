import { store, geocodeCity } from '@/lib/store';

const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSupabase() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
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
