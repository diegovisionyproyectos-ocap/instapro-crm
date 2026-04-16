'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Project, PhaseType, ProjectStatus } from '@/lib/types';
import { PHASE_LABELS } from '@/lib/projectDefaults';

const PHASE_ORDER: PhaseType[] = ['pre_production', 'production', 'post_production'];

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700' },
  on_hold: { label: 'En pausa', color: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-600' },
};

const PHASE_STATUS_COLORS = {
  pending: 'bg-slate-200 text-slate-400',
  in_progress: 'bg-blue-500 text-white',
  completed: 'bg-emerald-500 text-white',
};

function fmt(n: number) {
  return '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

function PhaseProgress({ project }: { project: Project }) {
  const phases = project.phases || [];
  return (
    <div className="flex items-center gap-1 mt-3">
      {PHASE_ORDER.map((pt, i) => {
        const phase = phases.find((ph) => ph.phase_type === pt);
        const status = phase?.status || 'pending';
        return (
          <div key={pt} className="flex items-center gap-1 flex-1">
            <div className={`flex-1 h-1.5 rounded-full ${
              status === 'completed' ? 'bg-emerald-500' :
              status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-200'
            }`} />
            {i < PHASE_ORDER.length - 1 && (
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChecklistProgress({ project }: { project: Project }) {
  const phases = project.phases || [];
  let total = 0, done = 0;
  phases.forEach((ph) => {
    (ph.checklist_items || []).forEach((item) => {
      total++;
      if (item.completed) done++;
    });
  });
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{done}/{total} tareas</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1 bg-slate-100 rounded-full">
        <div className="h-1 bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CurrentPhase({ project }: { project: Project }) {
  const phases = project.phases || [];
  const active = phases.find((ph) => ph.status === 'in_progress');
  const pending = phases.find((ph) => ph.status === 'pending');
  const phase = active || pending;
  if (!phase) return <span className="text-xs text-emerald-600 font-medium">Completado</span>;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PHASE_STATUS_COLORS[phase.status]}`}>
      {PHASE_LABELS[phase.phase_type]}
    </span>
  );
}

export default function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter);
  const active = projects.filter((p) => p.status === 'active').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Proyectos</h1>
          <p className="text-slate-500 text-sm mt-0.5">{active} proyectos activos · {projects.length} total</p>
        </div>
        <Link
          href="/deals"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva cotización
        </Link>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'on_hold', 'completed', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f === 'all' ? 'Todos' : STATUS_CONFIG[f as ProjectStatus].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Cargando proyectos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">No hay proyectos aún</p>
          <p className="text-slate-300 text-xs mt-1">Los proyectos se crean automáticamente cuando una cotización es ganada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const cfg = STATUS_CONFIG[project.status];
            return (
              <Link
                key={project.id}
                href={`/proyectos/${project.id}`}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-indigo-100 transition-all group"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {project.name}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>

                <div className="mb-1 flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-slate-500">{project.contact_name || '—'}</p>
                  {project.client_code && (
                    <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                      {project.client_code}
                    </span>
                  )}
                </div>
                {project.installer_name && (
                  <p className="text-xs text-slate-400">Instalador: {project.installer_name}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <CurrentPhase project={project} />
                  <span className="text-sm font-bold text-indigo-600">{fmt(project.value)}</span>
                </div>

                <PhaseProgress project={project} />
                <ChecklistProgress project={project} />

                {project.started_at && (
                  <p className="text-xs text-slate-400 mt-2">
                    Inicio: {new Date(project.started_at).toLocaleDateString('es-AR')}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
