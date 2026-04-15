'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Contact, ContactStatus, ProjectEvent } from '@/lib/types';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-100">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  ),
});

// ─── Types ──────────────────────────────────────────────────────────────────

type SmartFilter = 'all' | 'potential' | 'upcoming' | 'live';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  pulse: boolean;
  label: string;
  sublabel: string;
  tag: string;
  tagColor: string;
  date?: string;
  time?: string;
  projectId?: string;
  contactId?: string;
  installer?: string;
  sourceType: 'contact' | 'event';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ContactStatus, string> = {
  customer: '#10b981',
  prospect: '#f59e0b',
  lead: '#8b5cf6',
  inactive: '#94a3b8',
};

const STATUS_LABELS: Record<ContactStatus, string> = {
  customer: 'Cliente activo',
  prospect: 'Prospecto',
  lead: 'Lead',
  inactive: 'Inactivo',
};

const TODAY = new Date().toISOString().split('T')[0];
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split('T')[0];

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

// ─── Smart filter config ─────────────────────────────────────────────────────

const SMART_FILTERS: { key: SmartFilter; label: string; icon: string; color: string; bg: string; activeBg: string }[] = [
  {
    key: 'all',
    label: 'Todos los contactos',
    icon: '👥',
    color: '#6366f1',
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    activeBg: 'bg-indigo-600 text-white border-indigo-600',
  },
  {
    key: 'potential',
    label: 'Clientes potenciales',
    icon: '🔍',
    color: '#8b5cf6',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    activeBg: 'bg-purple-600 text-white border-purple-600',
  },
  {
    key: 'upcoming',
    label: 'Próximas instalaciones',
    icon: '📅',
    color: '#3b82f6',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    activeBg: 'bg-blue-600 text-white border-blue-600',
  },
  {
    key: 'live',
    label: 'Instalaciones hoy',
    icon: '⚡',
    color: '#f97316',
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    activeBg: 'bg-orange-500 text-white border-orange-500',
  },
];

// ─── Side panel ──────────────────────────────────────────────────────────────

function MarkerPanel({ marker, onClose }: { marker: MapMarker; onClose: () => void }) {
  return (
    <div className="p-5 border-b border-slate-100">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: marker.color }}
        >
          {marker.label.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors ml-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <h3 className="font-bold text-slate-800 text-base leading-tight">{marker.label}</h3>
      <p className="text-sm text-slate-500 mt-0.5">{marker.sublabel}</p>

      <span
        className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: marker.color + '22', color: marker.color }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: marker.color }} />
        {marker.tag}
      </span>

      {(marker.date || marker.time || marker.installer) && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-sm">
          {marker.date && (
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(marker.date)}{marker.time ? ` · ${marker.time.slice(0, 5)} hs` : ''}
            </div>
          )}
          {marker.installer && (
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Instalador: <span className="font-medium">{marker.installer}</span>
            </div>
          )}
        </div>
      )}

      {marker.projectId && (
        <Link
          href={`/proyectos/${marker.projectId}`}
          className="mt-3 block w-full text-center text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-lg transition-colors"
        >
          Ver proyecto →
        </Link>
      )}
      {marker.contactId && !marker.projectId && (
        <Link
          href={`/contacts/${marker.contactId}`}
          className="mt-3 block w-full text-center text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-lg transition-colors"
        >
          Ver expediente →
        </Link>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MapClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('all');
  const [contactFilter, setContactFilter] = useState<ContactStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle');

  useEffect(() => {
    Promise.all([fetch('/api/contacts'), fetch('/api/events')])
      .then(([cr, er]) => Promise.all([cr.json(), er.json()]))
      .then(([c, e]) => {
        setContacts(Array.isArray(c) ? c : []);
        setEvents(Array.isArray(e) ? e : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (navigator.geolocation) {
      setLocStatus('loading');
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLocation([pos.coords.latitude, pos.coords.longitude]); setLocStatus('ok'); },
        () => setLocStatus('denied'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // ── Build markers based on active smart filter ──────────────────────────
  const markers = useMemo((): MapMarker[] => {
    if (smartFilter === 'all') {
      // Show contacts
      return contacts
        .filter((c) => c.lat && c.lng)
        .filter((c) => contactFilter === 'all' || c.status === contactFilter)
        .filter((c) => {
          const q = search.toLowerCase();
          return !q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q);
        })
        .map((c) => ({
          id: c.id,
          lat: c.lat!,
          lng: c.lng!,
          color: STATUS_COLORS[c.status],
          pulse: false,
          label: c.name,
          sublabel: `${c.company}${c.city ? ` · ${c.city}` : ''}`,
          tag: STATUS_LABELS[c.status],
          tagColor: STATUS_COLORS[c.status],
          contactId: c.id,
          sourceType: 'contact' as const,
        }));
    }

    if (smartFilter === 'potential') {
      // Events of type 'visit' → clientes potenciales
      const seen = new Set<string>();
      return events
        .filter((e) => e.event_type === 'visit' && e.project?.lat && e.project?.lng)
        .filter((e) => {
          const key = `${e.project_id}-${e.event_date}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .filter((e) => {
          const q = search.toLowerCase();
          return !q || (e.project?.name || '').toLowerCase().includes(q) || (e.project?.contact_name || '').toLowerCase().includes(q);
        })
        .map((e) => ({
          id: e.id,
          lat: e.project!.lat!,
          lng: e.project!.lng!,
          color: '#8b5cf6',
          pulse: false,
          label: e.project?.contact_name || e.title,
          sublabel: e.project?.name || '',
          tag: `Visita · ${formatDate(e.event_date)}`,
          tagColor: '#8b5cf6',
          date: e.event_date,
          time: e.event_time || undefined,
          projectId: (e.project as any)?.id,
          contactId: (e.project as any)?.contact_id,
          sourceType: 'event' as const,
        }));
    }

    if (smartFilter === 'upcoming') {
      // Installation events from tomorrow onwards
      const seen = new Set<string>();
      return events
        .filter((e) => e.event_type === 'installation' && e.event_date >= TOMORROW && e.project?.lat && e.project?.lng)
        .filter((e) => {
          const key = e.project_id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .filter((e) => {
          const q = search.toLowerCase();
          return !q || (e.project?.name || '').toLowerCase().includes(q) || (e.project?.contact_name || '').toLowerCase().includes(q);
        })
        .map((e) => ({
          id: e.id,
          lat: e.project!.lat!,
          lng: e.project!.lng!,
          color: '#3b82f6',
          pulse: false,
          label: e.project?.name || e.title,
          sublabel: e.project?.contact_name || '',
          tag: `Instalación · ${formatDate(e.event_date)}`,
          tagColor: '#3b82f6',
          date: e.event_date,
          time: e.event_time || undefined,
          projectId: (e.project as any)?.id,
          installer: (e.project as any)?.installer_name,
          sourceType: 'event' as const,
        }));
    }

    if (smartFilter === 'live') {
      // Installation events happening TODAY
      return events
        .filter((e) => e.event_type === 'installation' && e.event_date === TODAY && e.project?.lat && e.project?.lng)
        .filter((e) => {
          const q = search.toLowerCase();
          return !q || (e.project?.name || '').toLowerCase().includes(q) || (e.project?.contact_name || '').toLowerCase().includes(q);
        })
        .map((e) => ({
          id: e.id,
          lat: e.project!.lat!,
          lng: e.project!.lng!,
          color: '#f97316',
          pulse: true,
          label: e.project?.name || e.title,
          sublabel: e.project?.contact_name || '',
          tag: '⚡ Instalación HOY',
          tagColor: '#f97316',
          date: e.event_date,
          time: e.event_time || undefined,
          projectId: (e.project as any)?.id,
          installer: (e.project as any)?.installer_name,
          sourceType: 'event' as const,
        }));
    }

    return [];
  }, [smartFilter, contactFilter, search, contacts, events]);

  // Count per smart filter
  const counts = useMemo(() => {
    const visitIds = new Set(events.filter((e) => e.event_type === 'visit' && e.project?.lat).map((e) => e.project_id));
    const upcoming = events.filter((e) => e.event_type === 'installation' && e.event_date >= TOMORROW && e.project?.lat);
    const upcomingIds = new Set(upcoming.map((e) => e.project_id));
    const live = events.filter((e) => e.event_type === 'installation' && e.event_date === TODAY && e.project?.lat);
    return {
      all: contacts.filter((c) => c.lat && c.lng).length,
      potential: visitIds.size,
      upcoming: upcomingIds.size,
      live: live.length,
    };
  }, [contacts, events]);

  function requestLocation() {
    if (!navigator.geolocation) return;
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation([pos.coords.latitude, pos.coords.longitude]); setLocStatus('ok'); },
      () => setLocStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const cfg = SMART_FILTERS.find((f) => f.key === smartFilter)!;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        {/* Smart filters row */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1 shrink-0">Vista:</span>
          {SMART_FILTERS.map((f) => {
            const active = smartFilter === f.key;
            const count = counts[f.key as keyof typeof counts];
            return (
              <button
                key={f.key}
                onClick={() => { setSmartFilter(f.key); setSelectedMarker(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                  active ? f.activeBg : f.bg + ' hover:opacity-80'
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  active ? 'bg-white/20' : 'bg-white/60'
                }`}>
                  {count}
                </span>
                {f.key === 'live' && count > 0 && (
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search + sub-filters row */}
        <div className="flex items-center gap-3 px-6 py-2.5 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={smartFilter === 'all' ? 'Buscar contactos...' : 'Buscar proyectos, clientes...'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedMarker(null); }}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* Contact sub-filters only visible in 'all' mode */}
          {smartFilter === 'all' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'customer', 'prospect', 'lead', 'inactive'] as const).map((k) => {
                const active = contactFilter === k;
                const color = k === 'all' ? '#6366f1' : STATUS_COLORS[k];
                const label = k === 'all' ? 'Todos' : STATUS_LABELS[k];
                const count = k === 'all'
                  ? contacts.filter(c => c.lat && c.lng).length
                  : contacts.filter(c => c.lat && c.lng && c.status === k).length;
                return (
                  <button
                    key={k}
                    onClick={() => setContactFilter(k)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                      active ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                    style={active ? { background: color, borderColor: color } : {}}
                  >
                    {k !== 'all' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? 'white' : color }} />}
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={requestLocation}
              disabled={locStatus === 'loading'}
              title={locStatus === 'denied' ? 'Permiso denegado' : 'Mi ubicación'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                locStatus === 'ok' ? 'bg-blue-600 text-white border-blue-600'
                : locStatus === 'denied' ? 'bg-red-50 text-red-500 border-red-200 cursor-not-allowed'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {locStatus === 'loading'
                ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
              }
              {locStatus === 'ok' ? 'Mi ubicación' : locStatus === 'denied' ? 'Sin permiso' : 'Mi ubicación'}
            </button>
          </div>
        </div>
      </div>

      {/* Map + panel */}
      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-slate-100">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            <LeafletMap
              markers={markers}
              selectedId={selectedMarker?.id || null}
              onSelect={(id) => setSelectedMarker(markers.find(m => m.id === id) || null)}
              userLocation={userLocation}
            />
          )}

          {/* Live badge overlay */}
          {smartFilter === 'live' && counts.live > 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {counts.live} instalación{counts.live > 1 ? 'es' : ''} en curso hoy
            </div>
          )}

          {/* Empty state overlay */}
          {!loading && markers.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 z-[500] pointer-events-none">
              <div className="text-4xl mb-2">{cfg.icon}</div>
              <p className="text-slate-500 font-medium text-sm">Sin {cfg.label.toLowerCase()}</p>
              {smartFilter === 'live' && (
                <p className="text-slate-400 text-xs mt-1">No hay instalaciones programadas para hoy</p>
              )}
              {smartFilter === 'upcoming' && (
                <p className="text-slate-400 text-xs mt-1">Agenda instalaciones desde el detalle de un proyecto</p>
              )}
              {smartFilter === 'potential' && (
                <p className="text-slate-400 text-xs mt-1">Agenda visitas desde el detalle de un proyecto</p>
              )}
            </div>
          )}

          {/* Count + legend overlay */}
          <div className="absolute bottom-6 left-4 z-[1000] bg-white rounded-xl shadow-md border border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Leyenda</p>
            <div className="space-y-1.5">
              {userLocation && (
                <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-slate-100">
                  <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm bg-blue-600" />
                  <span className="text-xs font-semibold text-blue-600">Tú</span>
                </div>
              )}
              {smartFilter === 'all' && (
                <>
                  {Object.entries(STATUS_COLORS).map(([k, color]) => (
                    <div key={k} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ background: color }} />
                      <span className="text-xs text-slate-600">{STATUS_LABELS[k as ContactStatus]}</span>
                    </div>
                  ))}
                </>
              )}
              {smartFilter === 'potential' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm bg-purple-500" />
                  <span className="text-xs text-slate-600">Visita programada</span>
                </div>
              )}
              {smartFilter === 'upcoming' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm bg-blue-500" />
                  <span className="text-xs text-slate-600">Instalación futura</span>
                </div>
              )}
              {smartFilter === 'live' && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm bg-orange-500 animate-pulse" />
                  <span className="text-xs text-slate-600">Instalación hoy</span>
                </div>
              )}
            </div>
          </div>

          <div className="absolute top-4 right-4 z-[1000] bg-white rounded-xl shadow-md border border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
            {markers.length} en el mapa
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
          {selectedMarker ? (
            <>
              <MarkerPanel marker={selectedMarker} onClose={() => setSelectedMarker(null)} />
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Todos en el mapa</p>
                </div>
                {markers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMarker(m)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left ${
                      selectedMarker?.id === m.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{m.label}</p>
                      <p className="text-xs text-slate-400 truncate">{m.sublabel}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="p-6 text-center border-b border-slate-100">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl"
                  style={{ background: cfg.color + '15' }}
                >
                  {cfg.icon}
                </div>
                <p className="text-sm font-semibold text-slate-700">{cfg.label}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {smartFilter === 'all' && 'Clic en un marcador para ver detalles'}
                  {smartFilter === 'potential' && 'Contactos con visitas agendadas'}
                  {smartFilter === 'upcoming' && 'Proyectos con instalaciones próximas'}
                  {smartFilter === 'live' && 'Instalaciones programadas para hoy'}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {markers.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 py-8">Sin elementos</p>
                ) : (
                  markers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMarker(m)}
                      className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${smartFilter === 'live' ? 'animate-pulse' : ''}`}
                        style={{ background: m.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{m.label}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {m.sublabel}
                          {m.date ? ` · ${formatDate(m.date)}` : ''}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
