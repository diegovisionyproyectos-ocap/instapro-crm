import { store } from '@/lib/store';
import { DEFAULT_CHECKLIST, PHASE_ORDER } from '@/lib/projectDefaults';
import type { PhaseType } from '@/lib/types';

const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSupabase() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

async function autoCreateProject(sb: NonNullable<Awaited<ReturnType<typeof getSupabase>>>, deal: { id: string; title: string; contact_id: string; contact_name: string; value: number }) {
  // Check if project already exists for this deal
  const { data: existing } = await sb
    .from('projects')
    .select('id')
    .eq('deal_id', deal.id)
    .maybeSingle();

  if (existing) return existing.id;

  // Get contact lat/lng
  const { data: contact } = await sb
    .from('contacts')
    .select('lat, lng, city')
    .eq('id', deal.contact_id)
    .maybeSingle();

  const { data: project, error } = await sb
    .from('projects')
    .insert([{
      deal_id: deal.id,
      contact_id: deal.contact_id,
      contact_name: deal.contact_name,
      name: deal.title,
      value: deal.value,
      status: 'active',
      lat: contact?.lat || null,
      lng: contact?.lng || null,
      started_at: new Date().toISOString().split('T')[0],
    }])
    .select()
    .single();

  if (error || !project) return null;

  for (let i = 0; i < PHASE_ORDER.length; i++) {
    const phaseType: PhaseType = PHASE_ORDER[i];
    const { data: phase } = await sb
      .from('project_phases')
      .insert([{
        project_id: project.id,
        phase_type: phaseType,
        status: i === 0 ? 'in_progress' : 'pending',
        phase_order: i,
        started_at: i === 0 ? new Date().toISOString() : null,
      }])
      .select()
      .single();

    if (!phase) continue;

    const items = DEFAULT_CHECKLIST[phaseType].map((text, idx) => ({
      phase_id: phase.id,
      project_id: project.id,
      text,
      completed: false,
      item_order: idx,
    }));

    await sb.from('checklist_items').insert(items);
  }

  return project.id;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const sb = await getSupabase();

  if (sb) {
    const { data, error } = await sb.from('deals').update(body).eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Auto-create project when deal is won
    let projectId: string | null = null;
    if (body.stage === 'closed-won') {
      projectId = await autoCreateProject(sb, {
        id,
        title: data.title,
        contact_id: data.contact_id,
        contact_name: data.contact_name,
        value: data.value,
      });
    }

    return Response.json({ ...data, project_id: projectId });
  }

  const updated = store.updateDeal(id, body);
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
    const { error } = await sb.from('deals').delete().eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return new Response(null, { status: 204 });
  }
  store.deleteDeal(id);
  return new Response(null, { status: 204 });
}
