import { DEFAULT_CHECKLIST, PHASE_ORDER } from '@/lib/projectDefaults';
import type { PhaseType } from '@/lib/types';

const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSB() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

export async function GET() {
  const sb = await getSB();
  if (!sb) return Response.json([]);

  const { data: projects, error } = await sb
    .from('projects')
    .select(`*, phases:project_phases(*, checklist_items(*))`)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Sort phases and items inside each project
  const result = (projects || []).map((p: any) => ({
    ...p,
    phases: (p.phases || [])
      .sort((a: any, b: any) => a.phase_order - b.phase_order)
      .map((ph: any) => ({
        ...ph,
        checklist_items: (ph.checklist_items || []).sort((a: any, b: any) => a.item_order - b.item_order),
      })),
  }));

  return Response.json(result);
}

export async function POST(request: Request) {
  const sb = await getSB();
  const body = await request.json();

  if (!sb) return Response.json({ error: 'Supabase not configured' }, { status: 500 });

  // Create the project
  const { data: project, error: pErr } = await sb
    .from('projects')
    .insert([{
      deal_id: body.deal_id || null,
      contact_id: body.contact_id || null,
      contact_name: body.contact_name || null,
      name: body.name,
      value: body.value || 0,
      status: 'active',
      address: body.address || null,
      lat: body.lat || null,
      lng: body.lng || null,
      installer_name: body.installer_name || null,
      notes: body.notes || null,
      started_at: new Date().toISOString().split('T')[0],
    }])
    .select()
    .single();

  if (pErr) return Response.json({ error: pErr.message }, { status: 500 });

  // Create 3 phases with default checklists
  for (let i = 0; i < PHASE_ORDER.length; i++) {
    const phaseType: PhaseType = PHASE_ORDER[i];
    const { data: phase, error: phErr } = await sb
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

    if (phErr || !phase) continue;

    // Insert default checklist items
    const items = DEFAULT_CHECKLIST[phaseType].map((text, idx) => ({
      phase_id: phase.id,
      project_id: project.id,
      text,
      completed: false,
      item_order: idx,
    }));

    await sb.from('checklist_items').insert(items);
  }

  // Return the full project with phases
  const { data: full } = await sb
    .from('projects')
    .select(`*, phases:project_phases(*, checklist_items(*))`)
    .eq('id', project.id)
    .single();

  return Response.json(full, { status: 201 });
}
