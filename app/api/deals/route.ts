import { store } from '@/lib/store';

const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSupabase() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

export async function GET() {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.from('deals').select('*').order('created_at', { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }
  return Response.json(store.getDeals());
}

export async function POST(request: Request) {
  const body = await request.json();
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.from('deals').insert([body]).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data, { status: 201 });
  }
  const deal = store.createDeal(body);
  return Response.json(deal, { status: 201 });
}
