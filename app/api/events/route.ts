// Global events endpoint for calendar page — returns all events with project info
import { geocodeLocation, hasCoords } from '@/lib/geocoding';

type ProjectEventRow = {
  project?: ({
    contact_name?: string | null;
    address?: string | null;
    contact?: { client_code?: string | null; name?: string | null; city?: string | null; address?: string | null } | null;
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
    .select(`*, project:projects(id, name, contact_name, contact_id, lat, lng, address, status, installer_name, contact:contacts(client_code, name, city, address))`)
    .order('event_date', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const events = ((data || []) as ProjectEventRow[]).map((event) => ({
    ...event,
    project: event.project ? {
      ...event.project,
      contact_name: event.project.contact_name || event.project.contact?.name || null,
      client_code: event.project.contact?.client_code || null,
    } : undefined,
  }));

  await Promise.all(
    events.map(async (event) => {
      const project = event.project;
      if (!project || hasCoords(project.lat as number | null, project.lng as number | null)) return;

      const locationStr =
        (typeof project.address === 'string' && project.address) ||
        (typeof project.contact?.address === 'string' && project.contact.address) ||
        (typeof project.contact?.city === 'string' && project.contact.city) ||
        '';

      if (!locationStr) return;

      const coords = await geocodeLocation(locationStr);
      if (!coords) return;

      project.lat = coords.lat;
      project.lng = coords.lng;
      if (project.id) {
        await sb.from('projects').update(coords).eq('id', project.id);
      }
    })
  );

  return Response.json(events);
}
