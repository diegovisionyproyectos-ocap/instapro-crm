import { store, geocodeCity } from '@/lib/store';

const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSupabase() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

export async function GET() {
  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.from('contacts').select('*').order('created_at', { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }
  return Response.json(store.getContacts());
}

export async function POST(request: Request) {
  const body = await request.json();

  // Geocode city if provided and no coords
  if (body.city && !body.lat) {
    const coords = await geocodeCity(body.city);
    if (coords) { body.lat = coords.lat; body.lng = coords.lng; }
  }

  const sb = await getSupabase();
  if (sb) {
    const { data, error } = await sb.from('contacts').insert([body]).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data, { status: 201 });
  }
  const contact = store.createContact(body);
  return Response.json(contact, { status: 201 });
}
