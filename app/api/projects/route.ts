import { DEFAULT_CHECKLIST, PHASE_ORDER } from '@/lib/projectDefaults';
import type { PhaseType } from '@/lib/types';

type ChecklistItemRow = { item_order: number } & Record<string, unknown>;
type PhaseRow = { phase_order: number; checklist_items?: ChecklistItemRow[] | null } & Record<string, unknown>;
type ProjectRow = {
  contact?: { client_code?: string | null; name?: string | null } | null;
  contact_name?: string | null;
  phases?: PhaseRow[] | null;
} & Record<string, unknown>;

function normalizeProject(project: ProjectRow | null) {
  if (!project) return null;
  return {
    ...project,
    client_code: project.contact?.client_code || null,
    contact_name: project.contact_name || project.contact?.name || null,
    phases: (project.phases || [])
      .sort((a, b) => a.phase_order - b.phase_order)
      .map((phase) => ({
        ...phase,
        checklist_items: (phase.checklist_items || []).sort((a, b) => a.item_order - b.item_order),
      })),
  };
}

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
    .select(`*, contact:contacts(client_code, name), phases:project_phases(*, checklist_items(*))`)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json((projects || []).map(normalizeProject));
}

export async function POST(request: Request) {
  const sb = await getSB();
  const body = await request.json();

  if (!sb) return Response.json({ error: 'Supabase not configured' }, { status: 500 });

  let contactRecord: { name?: string | null; address?: string | null; lat?: number | null; lng?: number | null } | null = null;
  if (body.contact_id) {
    const { data: contact } = await sb
      .from('contacts')
      .select('name, address, lat, lng')
      .eq('id', body.contact_id)
      .maybeSingle();
    contactRecord = contact;
  }

  // Create the project
  const { data: project, error: pErr } = await sb
    .from('projects')
    .insert([{
      deal_id: body.deal_id || null,
      contact_id: body.contact_id || null,
      contact_name: contactRecord?.name || body.contact_name || null,
      name: body.name,
      value: body.value || 0,
      status: 'active',
      address: body.address || contactRecord?.address || null,
      lat: body.lat || contactRecord?.lat || null,
      lng: body.lng || contactRecord?.lng || null,
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
    .select(`*, contact:contacts(client_code, name), phases:project_phases(*, checklist_items(*))`)
    .eq('id', project.id)
    .single();

  return Response.json(normalizeProject(full), { status: 201 });
}
