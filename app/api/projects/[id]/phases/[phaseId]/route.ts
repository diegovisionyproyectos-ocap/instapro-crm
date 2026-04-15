const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSB() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  const { phaseId } = await params;
  const body = await request.json();
  const sb = await getSB();
  if (!sb) return Response.json({ error: 'Not configured' }, { status: 500 });

  const update: Record<string, unknown> = { status: body.status };
  if (body.status === 'completed') update.completed_at = new Date().toISOString();
  if (body.status === 'in_progress') update.started_at = new Date().toISOString();

  const { data, error } = await sb
    .from('project_phases')
    .update(update)
    .eq('id', phaseId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
