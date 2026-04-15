'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Contact, ContactStatus } from '@/lib/types';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-100">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  ),
});

const STATUS_LABELS: Record<ContactStatus, string> = {
  customer: 'Cliente activo',
  prospect: 'Prospecto',
  lead: 'Lead',
  inactive: 'Inactivo',
};

const STATUS_COLORS: Record<ContactStatus, string> = {
  customer: '#10b981',
  prospect: '#f59e0b',
  lead: '#6366f1',
  inactive: '#94a3b8',
};

const FILTERS: { key: ContactStatus | 'all'; label: string; color?: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'customer', label: 'Cliente activo', color: '#10b981' },
  { key: 'prospect', label: 'Prospecto', color: '#f59e0b' },
  { key: 'lead', label: 'Lead', color: '#6366f1' },
  { key: 'inactive', label: 'Inactivo', color: '#94a3b8' },
];


export default function MapClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ContactStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);

  useEffect(() => {
    fetch('/api/contacts')
      .then((r) => r.json())
      .then((d) => setContacts(Array.isArray(d) ? d : []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, []);

  const withCoords = contacts.filter((c) => c.lat && c.lng);

  const displayed = withCoords.filter((c) => {
    const matchFilter = filter === 'all' || c.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts: Record<string, number> = {
    all: withCoords.length,
    customer: withCoords.filter((c) => c.status === 'customer').length,
    prospect: withCoords.filter((c) => c.status === 'prospect').length,
    lead: withCoords.filter((c) => c.status === 'lead').length,
    inactive: withCoords.filter((c) => c.status === 'inactive').length,
  };

  const withoutCoords = contacts.filter((c) => !c.lat || !c.lng);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-200 shrink-0 flex-wrap">
        <h1 className="font-bold text-slate-800 text-base mr-2">Mapa de Contactos</h1>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar contactos, empresas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(({ key, label, color }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
                style={active ? { background: color ?? '#6366f1', borderColor: color ?? '#6366f1' } : {}}
              >
                {color && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: active ? 'white' : color }}
                  />
                )}
                {label}
                <span className={`ml-0.5 ${active ? 'opacity-80' : 'text-slate-400'}`}>
                  ({counts[key] ?? 0})
                </span>
              </button>
            );
          })}
        </div>

        {withoutCoords.length > 0 && (
          <span className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
            {withoutCoords.length} sin ubicación
          </span>
        )}
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
            <LeafletMap contacts={displayed} selected={selected} onSelect={setSelected} />
          )}

          {/* Legend overlay */}
          <div className="absolute bottom-6 left-4 z-[1000] bg-white rounded-xl shadow-md border border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Leyenda</p>
            <div className="space-y-1.5">
              {FILTERS.filter(f => f.color).map(({ key, label, color }) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ background: color }} />
                  <span className="text-xs text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Count overlay */}
          <div className="absolute top-4 right-4 z-[1000] bg-white rounded-xl shadow-md border border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
            {displayed.length} en el mapa
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Selected contact detail */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: STATUS_COLORS[selected.status] }}
                  >
                    {selected.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <h3 className="font-bold text-slate-800 text-base leading-tight">{selected.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{selected.company}</p>
                <span
                  className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: STATUS_COLORS[selected.status] + '20', color: STATUS_COLORS[selected.status] }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[selected.status] }} />
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>
              <div className="p-5 space-y-3 text-sm border-b border-slate-100">
                {selected.city && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selected.city}
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{selected.email}</span>
                  </div>
                )}
                {selected.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {selected.phone}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">Haz clic en un marcador</p>
              <p className="text-xs text-slate-400 mt-1">para ver los detalles del contacto</p>
            </div>
          )}

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {displayed.length} contacto{displayed.length !== 1 ? 's' : ''} en el mapa
              </p>
            </div>
            {displayed.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left ${
                  selected?.id === c.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: STATUS_COLORS[c.status] }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400 truncate">{c.city}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
