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

const STATUS_COLORS: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700',
  prospect: 'bg-yellow-100 text-yellow-700',
  customer: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  prospect: 'Prospecto',
  customer: 'Cliente',
  inactive: 'Inactivo',
};

export default function DashboardClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/contacts'), fetch('/api/deals')])
      .then(([cr, dr]) => Promise.all([cr.json(), dr.json()]))
      .then(([c, d]) => {
        setContacts(c);
        setDeals(d);
        setLoading(false);
      });
  }, []);

  const openDeals = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost');
  const wonDeals = deals.filter((d) => d.stage === 'closed-won');
  const leads = contacts.filter((c) => c.status === 'lead');

  const stats = [
    {
      label: 'Total Contactos',
      value: contacts.length,
      icon: '👥',
      color: 'bg-blue-50 border-blue-100',
      textColor: 'text-blue-600',
    },
    {
      label: 'Negocios Abiertos',
      value: openDeals.length,
      icon: '📋',
      color: 'bg-purple-50 border-purple-100',
      textColor: 'text-purple-600',
    },
    {
      label: 'Ingresos Ganados',
      value: fmt(wonDeals.reduce((s, d) => s + d.value, 0)),
      icon: '💰',
      color: 'bg-green-50 border-green-100',
      textColor: 'text-green-600',
    },
    {
      label: 'Leads Activos',
      value: leads.length,
      icon: '🎯',
      color: 'bg-orange-50 border-orange-100',
      textColor: 'text-orange-600',
    },
  ];

  if (loading) {
    return <div className="text-center text-slate-400 py-20">Cargando...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Resumen del CRM InstaPro</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon, color, textColor }) => (
          <div key={label} className={`rounded-xl border p-5 ${color}`}>
            <div className="text-2xl mb-2">{icon}</div>
            <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">Últimos Contactos</h2>
            <Link href="/contacts" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Ver todos →
            </Link>
          </div>
          {contacts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Sin contactos</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {contacts.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.company}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">Últimos Negocios</h2>
            <Link href="/deals" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Ver todos →
            </Link>
          </div>
          {deals.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Sin negocios</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {deals.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{d.title}</p>
                    <p className="text-xs text-slate-500">{d.contact_name} · {STAGE_LABELS[d.stage]}</p>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
