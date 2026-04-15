'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Contact, Deal } from '@/lib/types';

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

const STAGE_LABELS: Record<string, string> = {
  following: 'En seguimiento',
  won: 'Proyecto ganado',
  lost: 'Perdido',
};

const STAGE_COLORS: Record<string, string> = {
  following: 'bg-blue-100 text-blue-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-600',
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
  const [activeProjects, setActiveProjects] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/contacts'), fetch('/api/deals'), fetch('/api/projects')])
      .then(([cr, dr, pr]) => Promise.all([cr.json(), dr.json(), pr.json()]))
      .then(([c, d, p]) => {
        setContacts(Array.isArray(c) ? c : []);
        setDeals(Array.isArray(d) ? d : []);
        setActiveProjects(Array.isArray(p) ? p.filter((proj: any) => proj.status === 'active').length : 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openDeals = deals.filter((d) => d.stage === 'following');
  const wonDeals = deals.filter((d) => d.stage === 'won');
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
      label: 'En seguimiento',
      value: openDeals.length,
      sub: fmt(openDeals.reduce((s, d) => s + d.value, 0)) + ' en juego',
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
      sub: `${wonDeals.length} proyectos ganados`,
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
      label: 'Proyectos Activos',
      value: activeProjects,
      sub: 'En ejecución',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
            <h2 className="font-semibold text-slate-800">Pipeline</h2>
            <Link href="/pipeline" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-3 py-1 rounded-full transition-colors">
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

      {/* CTAs */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0f4c81 0%, #1d4ed8 50%, #4f46e5 100%)' }}>
          <div className="px-8 py-6 flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">Proyectos</h3>
              <p className="text-blue-200 text-sm mt-1">
                {activeProjects > 0
                  ? `${activeProjects} proyecto${activeProjects > 1 ? 's' : ''} en ejecución`
                  : 'Gestiona tus instalaciones'}
              </p>
            </div>
            <Link
              href="/proyectos"
              className="bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap"
            >
              Ver proyectos →
            </Link>
          </div>
          <div className="absolute right-2 top-0 opacity-10 text-9xl select-none pointer-events-none leading-none">🔧</div>
        </div>

        <div className="rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)' }}>
          <div className="px-8 py-6 flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">Calendario</h3>
              <p className="text-indigo-200 text-sm mt-1">Agenda de instalaciones y visitas</p>
            </div>
            <Link
              href="/calendario"
              className="bg-white text-indigo-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm whitespace-nowrap"
            >
              Ver agenda →
            </Link>
          </div>
          <div className="absolute right-2 top-0 opacity-10 text-9xl select-none pointer-events-none leading-none">📅</div>
        </div>
      </div>
    </div>
  );
}
