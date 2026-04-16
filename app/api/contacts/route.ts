import { store, geocodeCity } from '@/lib/store';
import { getNextClientCode } from '@/lib/clientCodes';

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

  // Geocode city or address if provided and no coords
  const locationStr = body.address || body.city;
  if (locationStr && !body.lat) {
    const coords = await geocodeCity(locationStr);
    if (coords) { body.lat = coords.lat; body.lng = coords.lng; }
  }

  const sb = await getSupabase();
  if (sb) {
    for (let attempt = 0; attempt < 5; attempt++) {
      if (!body.client_code) {
        const { data: existingCodes, error: codesError } = await sb
          .from('contacts')
          .select('client_code')
          .not('client_code', 'is', null);

        if (codesError) {
          return Response.json({ error: codesError.message }, { status: 500 });
        }

        body.client_code = getNextClientCode((existingCodes || []).map((contact) => contact.client_code));
      }

      const { data, error } = await sb.from('contacts').insert([body]).select().single();
      if (!error) {
        return Response.json(data, { status: 201 });
      }

      if (error.code === '23505' && String(error.message).toLowerCase().includes('client_code')) {
        body.client_code = null;
        continue;
      }

      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ error: 'No se pudo generar un código de cliente único.' }, { status: 500 });
  }

  if (!body.client_code) {
    body.client_code = getNextClientCode(store.getContacts().map((contact) => contact.client_code));
  }

  const contact = store.createContact(body);
  return Response.json(contact, { status: 201 });
}
