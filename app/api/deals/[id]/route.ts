import { store } from '@/lib/store';

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
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.from('deals').update(body).eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
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
