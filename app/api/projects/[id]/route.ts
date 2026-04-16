const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSB() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await getSB();
  if (!sb) return Response.json({ error: 'Not configured' }, { status: 500 });

  const { data, error } = await sb
    .from('projects')
    .select(`*, contact:contacts(client_code, name), phases:project_phases(*, checklist_items(*))`)
    .eq('id', id)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });

  return Response.json(normalizeProject(data));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const sb = await getSB();
  if (!sb) return Response.json({ error: 'Not configured' }, { status: 500 });

  const { data, error } = await sb
    .from('projects')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await getSB();
  if (!sb) return Response.json({ error: 'Not configured' }, { status: 500 });

  const { error } = await sb.from('projects').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
