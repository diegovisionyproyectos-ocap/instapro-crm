const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSB() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await getSB();
  if (!sb) return Response.json([]);

  const { data, error } = await sb
    .from('project_events')
    .select('*')
    .eq('project_id', id)
    .order('event_date', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const sb = await getSB();
  if (!sb) return Response.json({ error: 'Not configured' }, { status: 500 });

  const { data, error } = await sb
    .from('project_events')
    .insert([{
      project_id: id,
      title: body.title,
      description: body.description || null,
      event_date: body.event_date,
      event_time: body.event_time || null,
      event_type: body.event_type || 'other',
    }])
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
