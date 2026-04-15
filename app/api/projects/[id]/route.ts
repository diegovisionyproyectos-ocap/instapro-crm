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
  if (!sb) return Response.json({ error: 'Not configured' }, { status: 500 });

  const { data, error } = await sb
    .from('projects')
    .select(`*, phases:project_phases(*, checklist_items(*))`)
    .eq('id', id)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });

  const result = {
    ...data,
    phases: (data.phases || [])
      .sort((a: any, b: any) => a.phase_order - b.phase_order)
      .map((ph: any) => ({
        ...ph,
        checklist_items: (ph.checklist_items || []).sort((a: any, b: any) => a.item_order - b.item_order),
      })),
  };

  return Response.json(result);
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
