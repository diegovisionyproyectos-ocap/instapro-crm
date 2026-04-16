'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Contact, Project, PhaseType, ProjectStatus } from '@/lib/types';
import { PHASE_LABELS, PHASE_ORDER } from '@/lib/projectDefaults';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700' },
  on_hold: { label: 'En pausa', color: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-600' },
};

const CONTACT_STATUS_COLORS: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700',
  prospect: 'bg-amber-100 text-amber-700',
  customer: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
};

const CONTACT_STATUS_LABELS: Record<string, string> = {
  lead: 'Lead', prospect: 'Prospecto', customer: 'Cliente activo', inactive: 'Inactivo',
};

function fmt(n: number) {
  return '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

function PhaseBar({ project }: { project: Project }) {
  const phases = project.phases || [];
  return (
    <div className="flex gap-1 mt-2">
      {PHASE_ORDER.map((pt) => {
        const ph = phases.find((p) => p.phase_type === pt);
        const status = ph?.status || 'pending';
        return (
          <div key={pt} className="flex-1">
            <div className={`h-1.5 rounded-full ${
              status === 'completed' ? 'bg-emerald-500' :
              status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-200'
            }`} />
          </div>
        );
      })}
    </div>
  );
}

interface NuevoProyectoFormProps {
  contactId: string;
  contactName: string;
  onCreated: () => void;
  onCancel: () => void;
}

function NuevoProyectoInline({ contactId, contactName, onCreated, onCancel }: NuevoProyectoFormProps) {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inp = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-300 transition';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || `Proyecto - ${contactName}`,
          contact_id: contactId,
          contact_name: contactName,
          stage: 'following',
          value: parseFloat(value) || 0,
          close_date: closeDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        }),
      });
      const deal = await res.json();
      if (!res.ok || deal.error) throw new Error(deal.error || 'Error al crear proyecto');
      onCreated();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-2">
      <p className="text-sm font-semibold text-indigo-800 mb-4">Nuevo proyecto para este cliente</p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Descripción del proyecto *</label>
          <input autoFocus required placeholder="Ej. Instalación eléctrica edificio norte"
            value={title} onChange={e => setTitle(e.target.value)} className={inp} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Valor estimado ($)</label>
            <input type="number" min="0" placeholder="0"
              value={value} onChange={e => setValue(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Fecha estimada</label>
            <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} className={inp} />
          </div>
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2 text-sm font-semibold hover:bg-white transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 text-sm font-bold transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Agregar al pipeline'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function ContactExpediente({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<(Contact & { projects: Project[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/contacts/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d.error ? null : d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 text-slate-400">Cliente no encontrado</div>;
  }

  const projects = data.projects || [];
  const totalValue = projects.reduce((s, p) => s + (p.value || 0), 0);
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
        <button onClick={() => router.push('/contacts')} className="hover:text-indigo-600 transition-colors">
          Clientes
        </button>
        <span>/</span>
        <span className="text-slate-600">{data.name}</span>
      </div>

      {/* Client card (expediente) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        {/* Client code strip */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 text-white rounded-xl px-4 py-1.5">
              <span className="text-xs font-medium opacity-80">Expediente</span>
              <span className="ml-2 font-bold font-mono text-base">{data.client_code || 'CLI-????'}</span>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${CONTACT_STATUS_COLORS[data.status]}`}>
              {CONTACT_STATUS_LABELS[data.status]}
            </span>
          </div>
          <button
            onClick={() => router.push('/contacts')}
            className="text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Volver
          </button>
        </div>

        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow shrink-0">
            {data.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{data.name}</h1>
            {data.company && <p className="text-slate-500 text-sm">{data.company}</p>}
            {data.city && <p className="text-slate-400 text-xs mt-0.5">{data.city}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          {data.phone && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Teléfono</p>
              <a href={`tel:${data.phone}`} className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">{data.phone}</a>
            </div>
          )}
          {data.email && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Email</p>
              <a href={`mailto:${data.email}`} className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors truncate block">{data.email}</a>
            </div>
          )}
          {data.address && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Dirección</p>
              <p className="text-sm font-medium text-slate-700">{data.address}</p>
            </div>
          )}
          {!data.address && data.city && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Ciudad</p>
              <p className="text-sm font-medium text-slate-700">{data.city}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Proyectos', value: projects.length, color: 'text-slate-800' },
          { label: 'Activos', value: activeCount, color: 'text-blue-700' },
          { label: 'Completados', value: completedCount, color: 'text-emerald-700' },
          { label: 'Facturado', value: fmt(totalValue), color: 'text-indigo-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Projects history */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <div>
            <h2 className="font-semibold text-slate-800">Historial de proyectos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Todos los proyectos vinculados a este expediente</p>
          </div>
          <button
            onClick={() => setShowNewProject(v => !v)}
            className="flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo proyecto
          </button>
        </div>

        <div className="px-6 py-4">
          {showNewProject && (
            <NuevoProyectoInline
              contactId={id}
              contactName={data.name}
              onCreated={() => { setShowNewProject(false); load(); }}
              onCancel={() => setShowNewProject(false)}
            />
          )}

          {projects.length === 0 && !showNewProject ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm font-medium">Sin proyectos aún</p>
              <p className="text-slate-400 text-xs mt-1">Hacé clic en "Nuevo proyecto" para vincular el primero</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 -mx-6">
              {projects.map((p) => {
                const cfg = STATUS_CONFIG[p.status];
                const phases = p.phases || [];
                let total = 0, done = 0;
                phases.forEach((ph) => {
                  (ph.checklist_items || []).forEach((item) => { total++; if (item.completed) done++; });
                });
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <Link
                    key={p.id}
                    href={`/proyectos/${p.id}`}
                    className="block px-6 py-4 hover:bg-slate-50/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors text-sm">
                            {p.name}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {p.installer_name && (
                          <p className="text-xs text-slate-400">Instalador: {p.installer_name}</p>
                        )}
                        <PhaseBar project={p} />
                        {total > 0 && (
                          <p className="text-xs text-slate-400 mt-1">{pct}% completado · {done}/{total} tareas</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-indigo-600">{fmt(p.value || 0)}</p>
                        {p.started_at && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(p.started_at + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors ml-auto mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
