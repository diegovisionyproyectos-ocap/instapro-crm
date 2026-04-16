import { store } from '@/lib/store';

type DealRow = {
  contact?: { client_code?: string | null } | null;
} & Record<string, unknown>;

const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSupabase() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

export async function GET() {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('deals')
      .select('*, contact:contacts(client_code)')
      .order('created_at', { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(((data || []) as DealRow[]).map((deal) => ({
      ...deal,
      client_code: deal.contact?.client_code || null,
    })));
  }
  return Response.json(store.getDeals());
}

export async function POST(request: Request) {
  const body = await request.json();
  const sb = await getSupabase();
  if (sb) {
    let clientCode: string | null = null;
    if (body.contact_id) {
      const { data: contact } = await sb
        .from('contacts')
        .select('name, client_code')
        .eq('id', body.contact_id)
        .maybeSingle();

      if (contact) {
        body.contact_name = contact.name;
        clientCode = contact.client_code;
      }
    }

    const { data, error } = await sb
      .from('deals')
      .insert([body])
      .select('*, contact:contacts(client_code)')
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({
      ...data,
      client_code: data.contact?.client_code || clientCode,
    }, { status: 201 });
  }
  const deal = store.createDeal(body);
  return Response.json(deal, { status: 201 });
}
