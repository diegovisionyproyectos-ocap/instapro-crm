// Global events endpoint for calendar page — returns all events with project info
type ProjectEventRow = {
  project?: ({
    contact_name?: string | null;
    contact?: { client_code?: string | null; name?: string | null } | null;
  } & Record<string, unknown>) | null;
} & Record<string, unknown>;

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
    .select(`*, project:projects(id, name, contact_name, contact_id, lat, lng, status, installer_name, contact:contacts(client_code, name))`)
    .order('event_date', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(((data || []) as ProjectEventRow[]).map((event) => ({
    ...event,
    project: event.project ? {
      ...event.project,
      contact_name: event.project.contact_name || event.project.contact?.name || null,
      client_code: event.project.contact?.client_code || null,
    } : undefined,
  })));
}
