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
  lead: 'Lead', prospect: 'Prospecto', customer: 'Cliente', inactive: 'Inactivo',
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
            <p className="text-center text-xs text-slate-400 mt-0.5 leading-none">
              {PHASE_LABELS[pt].split('-')[0].trim().slice(0, 4)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function ContactExpediente({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<(Contact & { projects: Project[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/contacts/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d.error ? null : d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

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
          Contactos
        </button>
        <span>/</span>
        <span className="text-slate-600">{data.name}</span>
      </div>

      {/* Client card (expediente) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow">
              {data.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{data.name}</h1>
              <p className="text-slate-500 text-sm">{data.company}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-1 ${CONTACT_STATUS_COLORS[data.status]}`}>
                {CONTACT_STATUS_LABELS[data.status]}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push('/contacts')}
            className="text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Volver
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-50">
          {data.phone && (
            <div>
              <p className="text-xs text-slate-400">Teléfono</p>
              <p className="text-sm font-medium text-slate-700">{data.phone}</p>
            </div>
          )}
          {data.email && (
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm font-medium text-slate-700 truncate">{data.email}</p>
            </div>
          )}
          {data.city && (
            <div>
              <p className="text-xs text-slate-400">Ciudad</p>
              <p className="text-sm font-medium text-slate-700">{data.city}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total proyectos', value: projects.length, color: 'text-slate-800' },
          { label: 'Activos', value: activeCount, color: 'text-blue-700' },
          { label: 'Valor total', value: fmt(totalValue), color: 'text-indigo-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Projects history */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <h2 className="font-semibold text-slate-800">Historial de proyectos</h2>
          <Link
            href="/deals"
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            + Nueva cotización
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">Sin proyectos aún</p>
            <p className="text-slate-300 text-xs mt-1">Los proyectos aparecerán aquí cuando se ganen cotizaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {projects.map((p) => {
              const cfg = STATUS_CONFIG[p.status];
              const phases = p.phases || [];
              let total = 0, done = 0;
              phases.forEach((ph) => {
                (ph.checklist_items || []).forEach((item) => { total++; if (item.completed) done++; });
              });

              return (
                <Link
                  key={p.id}
                  href={`/proyectos/${p.id}`}
                  className="block px-6 py-4 hover:bg-slate-50/50 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 group-hover:text-indigo-700 transition-colors text-sm">
                          {p.name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {p.installer_name && (
                        <p className="text-xs text-slate-400 mt-0.5">Instalador: {p.installer_name}</p>
                      )}
                      <PhaseBar project={p} />
                      {total > 0 && (
                        <p className="text-xs text-slate-400 mt-1">{done}/{total} tareas completadas</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-indigo-600">{fmt(p.value)}</p>
                      {p.started_at && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(p.started_at + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
