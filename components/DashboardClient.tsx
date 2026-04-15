'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Contact, Deal } from '@/lib/types';

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

const STAGE_LABELS: Record<string, string> = {
  prospecting: 'Prospección',
  qualification: 'Calificación',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
  'closed-won': 'Ganado',
  'closed-lost': 'Perdido',
};

const STAGE_COLORS: Record<string, string> = {
  prospecting: 'bg-slate-100 text-slate-600',
  qualification: 'bg-blue-100 text-blue-700',
  proposal: 'bg-purple-100 text-purple-700',
  negotiation: 'bg-yellow-100 text-yellow-700',
  'closed-won': 'bg-green-100 text-green-700',
  'closed-lost': 'bg-red-100 text-red-600',
};

const STATUS_COLORS: Record<string, string> = {
  lead: 'bg-blue-50 text-blue-600 border border-blue-100',
  prospect: 'bg-amber-50 text-amber-600 border border-amber-100',
  customer: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  inactive: 'bg-slate-50 text-slate-500 border border-slate-100',
};

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  prospect: 'Prospecto',
  customer: 'Cliente',
  inactive: 'Inactivo',
};

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

const AVATAR_COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500', 'bg-orange-500', 'bg-cyan-500'];

export default function DashboardClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/contacts'), fetch('/api/deals')])
      .then(([cr, dr]) => Promise.all([cr.json(), dr.json()]))
      .then(([c, d]) => {
        setContacts(Array.isArray(c) ? c : []);
        setDeals(Array.isArray(d) ? d : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openDeals = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
  const wonDeals = deals.filter((d) => d.stage === 'closed-won');
  const customers = contacts.filter((c) => c.status === 'customer');
  const leads = contacts.filter((c) => c.status === 'lead');

  const stats = [
    {
      label: 'Total Contactos',
      value: contacts.length,
      sub: `${customers.length} clientes activos`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Negocios Abiertos',
      value: openDeals.length,
      sub: fmt(openDeals.reduce((s, d) => s + d.value, 0)) + ' en pipeline',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      gradient: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Ingresos Ganados',
      value: fmt(wonDeals.reduce((s, d) => s + d.value, 0)),
      sub: `${wonDeals.length} negocios cerrados`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-green-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Leads Activos',
      value: leads.length,
      sub: 'Por convertir',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      gradient: 'from-orange-500 to-amber-500',
      bg: 'bg-orange-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Bienvenido a tu CRM — aquí tienes el resumen de hoy.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map(({ label, value, sub, icon, gradient }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-4 shadow-sm`}>
              {icon}
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm font-medium text-slate-700 mt-0.5">{label}</div>
            <div className="text-xs text-slate-400 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contacts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <h2 className="font-semibold text-slate-800">Últimos Contactos</h2>
            <Link href="/contacts" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-3 py-1 rounded-full transition-colors">
              Ver todos →
            </Link>
          </div>
          {contacts.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Sin contactos aún</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {contacts.slice(0, 5).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.company}{c.city ? ` · ${c.city}` : ''}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deals */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <h2 className="font-semibold text-slate-800">Últimos Negocios</h2>
            <Link href="/deals" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-3 py-1 rounded-full transition-colors">
              Ver todos →
            </Link>
          </div>
          {deals.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Sin negocios aún</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {deals.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{d.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500">{d.contact_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[d.stage]}`}>
                        {STAGE_LABELS[d.stage]}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-indigo-600 whitespace-nowrap">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map CTA */}
      <div className="mt-6 rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)' }}>
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">Mapa de Clientes</h3>
            <p className="text-indigo-200 text-sm mt-1">
              {customers.length > 0
                ? `${customers.length} cliente${customers.length > 1 ? 's' : ''} activo${customers.length > 1 ? 's' : ''} en el mapa`
                : 'Visualiza tus contactos en el mapa'}
            </p>
          </div>
          <Link
            href="/mapa"
            className="bg-white text-indigo-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm whitespace-nowrap"
          >
            Ver mapa →
          </Link>
        </div>
        <div className="absolute right-0 top-0 opacity-10 text-9xl select-none pointer-events-none leading-none">🗺</div>
      </div>
    </div>
  );
}
