'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Contact, ContactStatus } from '@/lib/types';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false, loading: () => (
  <div className="h-full flex items-center justify-center bg-slate-50 rounded-2xl">
    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
  </div>
) });

const STATUS_LABELS: Record<ContactStatus, string> = {
  lead: 'Lead',
  prospect: 'Prospecto',
  customer: 'Cliente',
  inactive: 'Inactivo',
};

const LEGEND = [
  { status: 'customer' as ContactStatus, label: 'Cliente', color: '#10b981', note: 'Pin con ✓' },
  { status: 'prospect' as ContactStatus, label: 'Prospecto', color: '#f59e0b' },
  { status: 'lead' as ContactStatus, label: 'Lead', color: '#6366f1' },
  { status: 'inactive' as ContactStatus, label: 'Inactivo', color: '#94a3b8' },
];

export default function MapClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ContactStatus | 'all'>('all');

  useEffect(() => {
    fetch('/api/contacts')
      .then(r => r.json())
      .then(d => setContacts(Array.isArray(d) ? d : []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, []);

  const withCoords = contacts.filter(c => c.lat && c.lng);
  const displayed = filter === 'all' ? withCoords : withCoords.filter(c => c.status === filter);
  const customers = contacts.filter(c => c.status === 'customer');
  const withoutCoords = contacts.filter(c => !c.lat || !c.lng);

  return (
    <div className="max-w-7xl h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mapa de Contactos</h1>
          <p className="text-slate-500 mt-1">
            {withCoords.length} contacto{withCoords.length !== 1 ? 's' : ''} geolocalizados
            {customers.length > 0 && ` · ${customers.length} cliente${customers.length > 1 ? 's' : ''} marcado${customers.length > 1 ? 's' : ''} en verde`}
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {(['all', 'customer', 'prospect', 'lead'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
              }`}
            >
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-slate-100">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-slate-50">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            <LeafletMap contacts={displayed} />
          )}
        </div>

        {/* Side panel */}
        <div className="w-72 shrink-0 flex flex-col gap-4">
          {/* Legend */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Leyenda</h3>
            <div className="space-y-2.5">
              {LEGEND.map(({ label, color, note }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-sm text-slate-700">{label}</span>
                  {note && <span className="text-xs text-slate-400 ml-auto">{note}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Contact list */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-50">
              <h3 className="font-semibold text-slate-800 text-sm">En el mapa</h3>
            </div>
            <div className="overflow-y-auto flex-1">
              {displayed.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">Sin contactos geolocalizados</div>
              ) : (
                displayed.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                      background: c.status === 'customer' ? '#10b981' : c.status === 'prospect' ? '#f59e0b' : c.status === 'lead' ? '#6366f1' : '#94a3b8'
                    }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400 truncate">{c.city}</p>
                    </div>
                    {c.status === 'customer' && (
                      <span className="ml-auto text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold shrink-0">
                        Cliente
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sin coords warning */}
          {withoutCoords.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700">
                {withoutCoords.length} contacto{withoutCoords.length > 1 ? 's' : ''} sin ubicación
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Agrega una ciudad para verlos en el mapa.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
