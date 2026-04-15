const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSB() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { eventId } = await params;
  const body = await request.json();
  const sb = await getSB();
  if (!sb) return Response.json({ error: 'Not configured' }, { status: 500 });

  const { data, error } = await sb
    .from('project_events')
    .update(body)
    .eq('id', eventId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { eventId } = await params;
  const sb = await getSB();
  if (!sb) return Response.json({ error: 'Not configured' }, { status: 500 });

  const { error } = await sb.from('project_events').delete().eq('id', eventId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
