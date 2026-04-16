'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Deal, DealStage } from '@/lib/types';
import NuevoClienteForm from './NuevoClienteForm';

const STAGES: {
  key: DealStage;
  label: string;
  sub: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}[] = [
  {
    key: 'following',
    label: 'En seguimiento',
    sub: 'Cierre de ventas',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: '🔄',
  },
  {
    key: 'won',
    label: 'Proyecto ganado',
    sub: 'Cotización aceptada',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: '✅',
  },
  {
    key: 'lost',
    label: 'Proyecto perdido',
    sub: 'No concretado',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '❌',
  },
];

function fmt(n: number) {
  return '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

function DealCard({
  deal,
  onMove,
  onDelete,
  onView,
}: {
  deal: Deal;
  onMove: (stage: DealStage) => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const [open, setOpen] = useState(false);
  const otherStages = STAGES.filter((s) => s.key !== deal.stage);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 group relative">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-slate-800 text-sm leading-snug flex-1 pr-2 line-clamp-2">
          {deal.title}
        </h4>
        <div className="relative shrink-0">
          <button
            onClick={() => setOpen(!open)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {open && (
            <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[160px]">
              {otherStages.map((s) => (
                <button
                  key={s.key}
                  onClick={() => { onMove(s.key); setOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <span>{s.icon}</span>
                  <span className="text-slate-700">Mover a: {s.label}</span>
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => { onDelete(); setOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <p className="text-xs text-slate-500">{deal.contact_name}</p>
        {deal.client_code && (
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
            {deal.client_code}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-indigo-600">{fmt(deal.value)}</span>
        {deal.close_date && (
          <span className="text-xs text-slate-400">
            {new Date(deal.close_date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {/* Won: show "Ver proyecto" */}
      {deal.stage === 'won' && (
        <button
          onClick={onView}
          className="mt-3 w-full text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold py-1.5 rounded-lg transition-colors"
        >
          Ver proyecto →
        </button>
      )}
    </div>
  );
}

export default function PipelineClient() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/deals');
      const data = await res.json();
      setDeals(Array.isArray(data) ? data : []);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function moveStage(deal: Deal, stage: DealStage) {
    const res = await fetch(`/api/deals/${deal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...deal, stage }),
    });
    const data = await res.json();
    if (stage === 'won' && data.project_id) {
      router.push(`/proyectos/${data.project_id}`);
      return;
    }
    load();
  }

  async function deleteDeal(id: string) {
    if (!confirm('¿Eliminar este seguimiento?')) return;
    await fetch(`/api/deals/${id}`, { method: 'DELETE' });
    load();
  }

  async function goToProject(deal: Deal) {
    // Find the project linked to this deal
    const res = await fetch('/api/projects');
    const projects = await res.json();
    const proj = Array.isArray(projects) ? projects.find((p: any) => p.deal_id === deal.id) : null;
    if (proj) {
      router.push(`/proyectos/${proj.id}`);
    } else {
      // Create project if missing
      const r = await fetch(`/api/deals/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...deal, stage: 'won' }),
      });
      const d = await r.json();
      if (d.project_id) router.push(`/proyectos/${d.project_id}`);
    }
  }

  const totalFollowing = deals
    .filter((d) => d.stage === 'following')
    .reduce((s, d) => s + d.value, 0);

  const totalWon = deals
    .filter((d) => d.stage === 'won')
    .reduce((s, d) => s + d.value, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pipeline de ventas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {deals.filter(d => d.stage === 'following').length} en seguimiento ·{' '}
            <span className="text-emerald-600 font-medium">{fmt(totalWon)} ganado</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo cliente
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {STAGES.map((s) => {
          const stageDeals = deals.filter((d) => d.stage === s.key);
          const total = stageDeals.reduce((sum, d) => sum + d.value, 0);
          return (
            <div key={s.key} className={`rounded-xl border-2 ${s.border} ${s.bg} px-4 py-3`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{s.icon}</span>
                <span className={`text-xs font-bold uppercase tracking-wide ${s.color}`}>{s.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-800">{stageDeals.length}</p>
              {total > 0 && <p className={`text-xs font-medium ${s.color} opacity-80`}>{fmt(total)}</p>}
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Pipeline columns */}
      {loading ? (
        <div className="text-center text-slate-400 py-16">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.key);
            return (
              <div key={stage.key}>
                <div className={`flex items-center gap-2 mb-3 pb-3 border-b-2 ${stage.border}`}>
                  <span className="text-base">{stage.icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${stage.color}`}>{stage.label}</p>
                    <p className="text-xs text-slate-400">{stageDeals.length} proyecto{stageDeals.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="space-y-3 min-h-[8rem]">
                  {stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onMove={(s) => moveStage(deal, s)}
                      onDelete={() => deleteDeal(deal.id)}
                      onView={() => goToProject(deal)}
                    />
                  ))}
                  {stageDeals.length === 0 && (
                    <div className={`rounded-xl border-2 border-dashed ${stage.border} p-6 text-center`}>
                      <p className="text-xs text-slate-300">{stage.icon} Sin proyectos aquí</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nuevo cliente modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <NuevoClienteForm onClose={() => { setShowForm(false); load(); }} />
        </div>
      )}
    </div>
  );
}
