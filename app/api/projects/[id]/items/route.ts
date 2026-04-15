const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSB() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const sb = await getSB();
  if (!sb) return Response.json({ error: 'Not configured' }, { status: 500 });

  // Get current max order for the phase
  const { data: existing } = await sb
    .from('checklist_items')
    .select('item_order')
    .eq('phase_id', body.phase_id)
    .order('item_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].item_order + 1 : 0;

  const { data, error } = await sb
    .from('checklist_items')
    .insert([{
      phase_id: body.phase_id,
      project_id: id,
      text: body.text,
      completed: false,
      item_order: nextOrder,
    }])
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
