'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Contact, Project, ProjectStatus } from '@/lib/types';
import { PHASE_ORDER } from '@/lib/projectDefaults';

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
  lead: 'Lead',
  prospect: 'Prospecto',
  customer: 'Cliente activo',
  inactive: 'Inactivo',
};

function fmt(n: number) {
  return '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

function PhaseBar({ project }: { project: Project }) {
  const phases = project.phases || [];
  return (
    <div className="mt-2 flex gap-1">
      {PHASE_ORDER.map((phaseType) => {
        const phase = phases.find((item) => item.phase_type === phaseType);
        const status = phase?.status || 'pending';
        return (
          <div key={phaseType} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${
                status === 'completed'
                  ? 'bg-emerald-500'
                  : status === 'in_progress'
                    ? 'bg-blue-500'
                    : 'bg-slate-200'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

interface NuevoProyectoFormProps {
  contactId: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  company?: string;
  currentAddress?: string | null;
  onCreated: () => void;
  onCancel: () => void;
}

function NuevoProyectoInline({
  contactId,
  contactName,
  contactEmail,
  contactPhone,
  company,
  currentAddress,
  onCreated,
  onCancel,
}: NuevoProyectoFormProps) {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [address, setAddress] = useState(currentAddress || '');
  const [area, setArea] = useState('');
  const [installer, setInstaller] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition';
  const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (address.trim() && address.trim() !== (currentAddress || '').trim()) {
        await fetch(`/api/contacts/${contactId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: address.trim() }),
        });
      }

      const notesParts = [
        area.trim() ? `Area o medida: ${area.trim()}` : '',
        installer.trim() ? `Instalador sugerido: ${installer.trim()}` : '',
        address.trim() ? `Direccion del proyecto: ${address.trim()}` : '',
        notes.trim(),
      ].filter(Boolean);

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
          notes: notesParts.join('\n'),
        }),
      });
      const deal = await res.json();

      if (!res.ok || deal.error) {
        throw new Error(deal.error || 'Error al crear proyecto');
      }

      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el proyecto.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
      <div className="mb-4 rounded-2xl border border-indigo-100 bg-white/80 px-4 py-4">
        <p className="text-sm font-semibold text-indigo-900">Nuevo proyecto vinculado</p>
        <p className="mt-1 text-sm text-slate-800">{contactName}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
          {company && <span>Empresa: {company}</span>}
          {contactPhone && <span>Telefono: {contactPhone}</span>}
          {contactEmail && <span>Email: {contactEmail}</span>}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className={labelClass}>Descripcion del proyecto *</label>
          <input
            autoFocus
            required
            placeholder="Ej. Instalacion electrica edificio norte"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Valor estimado ($)</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha estimada</label>
            <input
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Area / medida</label>
            <input
              placeholder="Ej. 150 m2 o 200 lineales"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Instalador</label>
            <input
              placeholder="Responsable o cuadrilla"
              value={installer}
              onChange={(e) => setInstaller(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Direccion del proyecto</label>
          <input
            placeholder="Ubicacion del trabajo o referencia"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Notas adicionales</label>
          <textarea
            rows={3}
            placeholder="Materiales, urgencia, requerimientos, observaciones..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Agregar al pipeline'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function ContactExpediente({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<(Contact & { projects: Project[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/contacts/${id}`)
      .then((response) => response.json())
      .then((result) => setData(result.error ? null : result))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('newProject') === '1') {
      setShowNewProject(true);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!data) {
    return <div className="py-20 text-center text-slate-400">Cliente no encontrado</div>;
  }

  const projects = data.projects || [];
  const totalValue = projects.reduce((sum, project) => sum + (project.value || 0), 0);
  const activeCount = projects.filter((project) => project.status === 'active').length;
  const completedCount = projects.filter((project) => project.status === 'completed').length;

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => router.push('/contacts')} className="transition-colors hover:text-indigo-600">
          Clientes
        </button>
        <span>/</span>
        <span className="text-slate-600">{data.name}</span>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-600 px-4 py-1.5 text-white">
              <span className="text-xs font-medium opacity-80">Expediente</span>
              <span className="ml-2 font-mono text-base font-bold">{data.client_code || 'CLI-????'}</span>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CONTACT_STATUS_COLORS[data.status]}`}>
              {CONTACT_STATUS_LABELS[data.status]}
            </span>
          </div>
          <button
            onClick={() => router.push('/contacts')}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-200"
          >
            Volver
          </button>
        </div>

        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white shadow">
            {data.name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{data.name}</h1>
            {data.company && <p className="text-sm text-slate-600">{data.company}</p>}
            {data.city && <p className="mt-0.5 text-xs text-slate-400">{data.city}</p>}
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-3">
          {data.phone && (
            <div>
              <p className="mb-0.5 text-xs text-slate-400">Telefono</p>
              <a href={`tel:${data.phone}`} className="text-sm font-medium text-slate-700 transition-colors hover:text-indigo-600">
                {data.phone}
              </a>
            </div>
          )}
          {data.email && (
            <div>
              <p className="mb-0.5 text-xs text-slate-400">Email</p>
              <a href={`mailto:${data.email}`} className="block truncate text-sm font-medium text-slate-700 transition-colors hover:text-indigo-600">
                {data.email}
              </a>
            </div>
          )}
          {data.address ? (
            <div>
              <p className="mb-0.5 text-xs text-slate-400">Direccion</p>
              <p className="text-sm font-medium text-slate-700">{data.address}</p>
            </div>
          ) : data.city ? (
            <div>
              <p className="mb-0.5 text-xs text-slate-400">Ciudad</p>
              <p className="text-sm font-medium text-slate-700">{data.city}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Proyectos', value: projects.length, color: 'text-slate-800' },
          { label: 'Activos', value: activeCount, color: 'text-blue-700' },
          { label: 'Completados', value: completedCount, color: 'text-emerald-700' },
          { label: 'Facturado', value: fmt(totalValue), color: 'text-indigo-700' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 px-6 py-4">
          <div>
            <h2 className="font-semibold text-slate-800">Historial de proyectos</h2>
            <p className="mt-0.5 text-xs text-slate-400">Todos los proyectos vinculados a este expediente</p>
          </div>
          <button
            onClick={() => setShowNewProject((current) => !current)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              contactEmail={data.email}
              contactPhone={data.phone}
              company={data.company}
              currentAddress={data.address}
              onCreated={() => {
                setShowNewProject(false);
                router.replace(`/contacts/${id}`);
                load();
              }}
              onCancel={() => {
                setShowNewProject(false);
                router.replace(`/contacts/${id}`);
              }}
            />
          )}

          {projects.length === 0 && !showNewProject ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <svg className="h-6 w-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">Sin proyectos aun</p>
              <p className="mt-1 text-xs text-slate-400">Haz clic en &quot;Nuevo proyecto&quot; para vincular el primero</p>
            </div>
          ) : (
            <div className="-mx-6 divide-y divide-slate-50">
              {projects.map((project) => {
                const cfg = STATUS_CONFIG[project.status];
                const phases = project.phases || [];
                let total = 0;
                let done = 0;

                phases.forEach((phase) => {
                  (phase.checklist_items || []).forEach((item) => {
                    total++;
                    if (item.completed) done++;
                  });
                });

                const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <Link
                    key={project.id}
                    href={`/proyectos/${project.id}`}
                    className="group block px-6 py-4 transition-colors hover:bg-slate-50/60"
                  >
                    <div className="flex items-start justify-between">
                      <div className="mr-3 min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 transition-colors group-hover:text-indigo-700">
                            {project.name}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {project.installer_name && (
                          <p className="text-xs text-slate-400">Instalador: {project.installer_name}</p>
                        )}
                        <PhaseBar project={project} />
                        {total > 0 && (
                          <p className="mt-1 text-xs text-slate-400">{pct}% completado - {done}/{total} tareas</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-indigo-600">{fmt(project.value || 0)}</p>
                        {project.started_at && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {new Date(project.started_at + 'T12:00:00').toLocaleDateString('es-AR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                        <svg className="ml-auto mt-1 h-4 w-4 text-slate-300 transition-colors group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

