'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { ProjectEvent, EventType } from '@/lib/types';

const MapView = dynamic(() => import('./CalendarMapView'), { ssr: false, loading: () => (
  <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 text-sm">
    Cargando mapa...
  </div>
) });

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string; icon: string }> = {
  visit: { label: 'Visita', color: 'text-purple-700', bg: 'bg-purple-100', icon: '🔍' },
  delivery: { label: 'Entrega', color: 'text-amber-700', bg: 'bg-amber-100', icon: '📦' },
  installation: { label: 'Instalación', color: 'text-blue-700', bg: 'bg-blue-100', icon: '🔧' },
  meeting: { label: 'Reunión', color: 'text-indigo-700', bg: 'bg-indigo-100', icon: '📋' },
  payment: { label: 'Cobro', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: '💰' },
  other: { label: 'Otro', color: 'text-slate-600', bg: 'bg-slate-100', icon: '📌' },
};

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Adjust so week starts on Monday (0=Mon...6=Sun)
  const startOffset = (firstDay + 6) % 7;
  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarClient() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string>(toDateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const calDays = getCalendarDays(year, month);

  // Map date → events
  const eventsByDate = useMemo(() => {
    const map: Record<string, ProjectEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.event_date]) map[e.event_date] = [];
      map[e.event_date].push(e);
    });
    return map;
  }, [events]);

  const selectedEvents = eventsByDate[selectedDay] || [];

  // Map markers: events for selected day that have project lat/lng
  const mapMarkers = useMemo(() => {
    return selectedEvents
      .filter((e) => e.project?.lat && e.project?.lng)
      .map((e) => ({
        lat: e.project!.lat!,
        lng: e.project!.lng!,
        label: e.project?.name || e.title,
        sub: e.title,
        type: e.event_type,
      }));
  }, [selectedEvents]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Count events in this month for the label
  const monthEventCount = events.filter((e) => e.event_date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Calendario de Instalaciones</h1>
        <p className="text-slate-500 text-sm mt-0.5">{monthEventCount} eventos en {MONTHS[month]}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Calendar + selected day events */}
        <div className="space-y-4">
          {/* Calendar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="font-semibold text-slate-800">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d, i) => (
                <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const key = toDateKey(year, month, day);
                const dayEvents = eventsByDate[key] || [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`relative aspect-square flex flex-col items-center justify-start pt-1.5 rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : isToday
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {day}
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {dayEvents.slice(0, 3).map((e, j) => (
                          <span
                            key={j}
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-white/70' :
                              e.event_type === 'installation' ? 'bg-blue-500' :
                              e.event_type === 'delivery' ? 'bg-amber-500' :
                              e.event_type === 'payment' ? 'bg-emerald-500' :
                              e.event_type === 'visit' ? 'bg-purple-500' : 'bg-slate-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Events for selected day */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-3">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>

            {loading ? (
              <p className="text-sm text-slate-400">Cargando...</p>
            ) : selectedEvents.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">Sin eventos este día</p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((e) => {
                  const cfg = EVENT_TYPE_CONFIG[e.event_type];
                  return (
                    <div key={e.id} className={`flex items-start gap-3 p-3 rounded-xl ${cfg.bg}`}>
                      <span className="text-xl leading-none">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${cfg.color}`}>{e.title}</p>
                        <p className="text-xs text-slate-600 font-medium">{e.project?.name}</p>
                        {e.project?.contact_name && (
                          <p className="text-xs text-slate-500">{e.project.contact_name}</p>
                        )}
                        {e.event_time && (
                          <p className="text-xs text-slate-500 mt-0.5">{e.event_time.slice(0, 5)} hs</p>
                        )}
                        {e.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{e.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap gap-3">
              {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1">
                  <span className="text-sm">{v.icon}</span>
                  <span className="text-xs text-slate-500">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Map */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ minHeight: 520 }}>
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Mapa del día</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {mapMarkers.length > 0
                  ? `${mapMarkers.length} ubicación${mapMarkers.length > 1 ? 'es' : ''} para este día`
                  : 'Sin ubicaciones para este día'}
              </p>
            </div>
            <Link href="/mapa" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Ver mapa completo →
            </Link>
          </div>
          <div className="h-full" style={{ height: 'calc(100% - 65px)', minHeight: 455 }}>
            <MapView markers={mapMarkers} />
          </div>
        </div>
      </div>

      {/* Upcoming events list */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Próximos eventos</h3>
        {(() => {
          const upcoming = events
            .filter((e) => e.event_date >= todayKey)
            .slice(0, 10);

          if (upcoming.length === 0) return <p className="text-sm text-slate-400">Sin eventos próximos</p>;

          return (
            <div className="space-y-2">
              {upcoming.map((e) => {
                const cfg = EVENT_TYPE_CONFIG[e.event_type];
                return (
                  <div key={e.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <span className="text-lg">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{e.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-slate-500">{e.project?.name} · {e.project?.contact_name}</p>
                    </div>
                    <p className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(e.event_date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
