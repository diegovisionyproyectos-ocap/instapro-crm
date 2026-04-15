// Global events endpoint for calendar page — returns all events with project info
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getSB() {
  if (!useSupabase) return null;
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

export async function GET() {
  const sb = await getSB();
  if (!sb) return Response.json([]);

  const { data, error } = await sb
    .from('project_events')
    .select(`*, project:projects(name, contact_name, lat, lng, status)`)
    .order('event_date', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}
