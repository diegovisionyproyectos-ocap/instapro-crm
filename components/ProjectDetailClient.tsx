'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, ProjectPhase, ChecklistItem, ProjectEvent, PhaseType, PhaseStatus, EventType, ProjectStatus } from '@/lib/types';
import { PHASE_LABELS, PHASE_ORDER } from '@/lib/projectDefaults';

const PHASE_STATUS_CONFIG: Record<PhaseStatus, { label: string; dot: string; badge: string }> = {
  pending: { label: 'Pendiente', dot: 'bg-slate-300', badge: 'bg-slate-100 text-slate-500' },
  in_progress: { label: 'En proceso', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completado', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
};

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; icon: string }> = {
  visit: { label: 'Visita', color: 'bg-purple-100 text-purple-700', icon: '🔍' },
  delivery: { label: 'Entrega materiales', color: 'bg-amber-100 text-amber-700', icon: '📦' },
  installation: { label: 'Instalación', color: 'bg-blue-100 text-blue-700', icon: '🔧' },
  meeting: { label: 'Reunión', color: 'bg-indigo-100 text-indigo-700', icon: '📋' },
  payment: { label: 'Cobro', color: 'bg-emerald-100 text-emerald-700', icon: '💰' },
  other: { label: 'Otro', color: 'bg-slate-100 text-slate-600', icon: '📌' },
};

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'on_hold', label: 'En pausa' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

function fmt(n: number) {
  return '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

function ChecklistSection({
  phase,
  projectId,
  onUpdate,
}: {
  phase: ProjectPhase;
  projectId: string;
  onUpdate: () => void;
}) {
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);
  const items = phase.checklist_items || [];
  const done = items.filter((i) => i.completed).length;

  async function toggleItem(item: ChecklistItem) {
    await fetch(`/api/projects/${projectId}/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !item.completed }),
    });
    onUpdate();
  }

  async function deleteItem(itemId: string) {
    await fetch(`/api/projects/${projectId}/items/${itemId}`, { method: 'DELETE' });
    onUpdate();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    setAdding(true);
    await fetch(`/api/projects/${projectId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase_id: phase.id, text: newItem.trim() }),
    });
    setNewItem('');
    setAdding(false);
    onUpdate();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-500">{done}/{items.length} completadas</p>
        {items.length > 0 && (
          <div className="w-24 h-1 bg-slate-100 rounded-full">
            <div
              className="h-1 bg-emerald-500 rounded-full transition-all"
              style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 group">
            <button
              onClick={() => toggleItem(item)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                item.completed
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-300 hover:border-emerald-400'
              }`}
            >
              {item.completed && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className={`text-sm flex-1 ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {item.text}
            </span>
            <button
              onClick={() => deleteItem(item.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={addItem} className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Agregar tarea..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          type="submit"
          disabled={adding || !newItem.trim()}
          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          +
        </button>
      </form>
    </div>
  );
}

function EventsSection({ projectId, events, onUpdate }: { projectId: string; events: ProjectEvent[]; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', event_date: '', event_time: '', event_type: 'visit' as EventType, description: '' });
  const [saving, setSaving] = useState(false);

  const upcoming = events.filter((e) => e.event_date >= new Date().toISOString().split('T')[0]);
  const past = events.filter((e) => e.event_date < new Date().toISOString().split('T')[0]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/projects/${projectId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ title: '', event_date: '', event_time: '', event_type: 'visit', description: '' });
    onUpdate();
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/projects/${projectId}/events/${id}`, { method: 'DELETE' });
    onUpdate();
  }

  function EventRow({ event }: { event: ProjectEvent }) {
    const cfg = EVENT_TYPE_CONFIG[event.event_type];
    return (
      <div className="flex items-start gap-3 group">
        <div className="text-lg leading-none mt-0.5">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{event.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.color}`}>{cfg.label}</span>
            <span className="text-xs text-slate-400">
              {new Date(event.event_date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
              {event.event_time && ` · ${event.event_time.slice(0, 5)}`}
            </span>
          </div>
          {event.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{event.description}</p>}
        </div>
        <button
          onClick={() => deleteEvent(event.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-800">Calendario del proyecto</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          + Agregar evento
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 bg-slate-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input
                required
                placeholder="Título del evento"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Hora (opcional)</label>
              <input
                type="time"
                value={form.event_time}
                onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Tipo</label>
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value as EventType })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <textarea
                placeholder="Descripción (opcional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2 text-sm font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar evento'}
            </button>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Sin eventos programados</p>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Próximos</p>
              <div className="space-y-3">
                {upcoming.map((e) => <EventRow key={e.id} event={e} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pasados</p>
              <div className="space-y-3 opacity-60">
                {past.map((e) => <EventRow key={e.id} event={e} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [activePhase, setActivePhase] = useState<PhaseType>('pre_production');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', installer_name: '', address: '', notes: '', status: 'active' as ProjectStatus });

  async function load() {
    const [pRes, eRes] = await Promise.all([
      fetch(`/api/projects/${id}`),
      fetch(`/api/projects/${id}/events`),
    ]);
    const [p, e] = await Promise.all([pRes.json(), eRes.json()]);
    if (p && !p.error) {
      setProject(p);
      setEditForm({
        name: p.name || '',
        installer_name: p.installer_name || '',
        address: p.address || '',
        notes: p.notes || '',
        status: p.status || 'active',
      });
      // Auto-select the current active phase
      const active = (p.phases || []).find((ph: ProjectPhase) => ph.status === 'in_progress');
      if (active) setActivePhase(active.phase_type);
    }
    setEvents(Array.isArray(e) ? e : []);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const [pRes, eRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/events`),
      ]);
      const [p, e] = await Promise.all([pRes.json(), eRes.json()]);
      if (!active) return;

      if (p && !p.error) {
        setProject(p);
        setEditForm({
          name: p.name || '',
          installer_name: p.installer_name || '',
          address: p.address || '',
          notes: p.notes || '',
          status: p.status || 'active',
        });
        const activePhaseRecord = (p.phases || []).find((ph: ProjectPhase) => ph.status === 'in_progress');
        if (activePhaseRecord) setActivePhase(activePhaseRecord.phase_type);
      }

      setEvents(Array.isArray(e) ? e : []);
      setLoading(false);
    }

    void hydrate();

    return () => {
      active = false;
    };
  }, [id]);

  async function updatePhaseStatus(phaseId: string, status: PhaseStatus) {
    await fetch(`/api/projects/${id}/phases/${phaseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditing(false);
    load();
  }

  async function deleteProject() {
    if (!confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    router.push('/proyectos');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>Proyecto no encontrado.</p>
      </div>
    );
  }

  const currentPhase = (project.phases || []).find((ph) => ph.phase_type === activePhase);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <button onClick={() => router.push('/proyectos')} className="hover:text-indigo-600 transition-colors">
              Proyectos
            </button>
            <span>/</span>
            <span className="text-slate-600">{project.name}</span>
          </div>
          {editing ? (
            <form onSubmit={saveEdit} className="space-y-3 bg-white rounded-2xl border border-indigo-200 p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Nombre del proyecto</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Instalador</label>
                  <input
                    value={editForm.installer_name}
                    onChange={(e) => setEditForm({ ...editForm, installer_name: e.target.value })}
                    placeholder="Nombre del instalador"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Estado</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ProjectStatus })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Dirección del trabajo</label>
                  <input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="Dirección de instalación"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Notas</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)} className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2 text-sm font-medium hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">
                  Guardar
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
                  <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                    <p className="text-slate-500 text-sm">{project.contact_name || '—'}</p>
                    {project.client_code && (
                      <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700">
                        {project.client_code}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={deleteProject}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-50">
                <div>
                  <p className="text-xs text-slate-400">Valor</p>
                  <p className="text-sm font-bold text-indigo-600">{fmt(project.value)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Instalador</p>
                  <p className="text-sm font-medium text-slate-700">{project.installer_name || <span className="text-slate-400 italic">Sin asignar</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Inicio</p>
                  <p className="text-sm font-medium text-slate-700">
                    {project.started_at ? new Date(project.started_at + 'T12:00:00').toLocaleDateString('es-AR') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Dirección</p>
                  <p className="text-sm font-medium text-slate-700 truncate">{project.address || <span className="text-slate-400 italic">Sin dirección</span>}</p>
                </div>
              </div>
              {project.notes && (
                <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-50">{project.notes}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl">
        {PHASE_ORDER.map((pt, i) => {
          const phase = (project.phases || []).find((ph) => ph.phase_type === pt);
          const status = phase?.status || 'pending';
          const cfg = PHASE_STATUS_CONFIG[status];
          return (
            <button
              key={pt}
              onClick={() => setActivePhase(pt)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                activePhase === pt
                  ? 'bg-white shadow-sm text-slate-800'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <span className="hidden md:block">{PHASE_LABELS[pt]}</span>
              <span className="md:hidden">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Active phase panel */}
      {currentPhase && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-800">{PHASE_LABELS[activePhase]}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${PHASE_STATUS_CONFIG[currentPhase.status].badge}`}>
                {PHASE_STATUS_CONFIG[currentPhase.status].label}
              </span>
            </div>
            <div className="flex gap-2">
              {currentPhase.status === 'pending' && (
                <button
                  onClick={() => updatePhaseStatus(currentPhase.id, 'in_progress')}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Iniciar fase
                </button>
              )}
              {currentPhase.status === 'in_progress' && (
                <button
                  onClick={() => updatePhaseStatus(currentPhase.id, 'completed')}
                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Marcar como completada
                </button>
              )}
              {currentPhase.status === 'completed' && (
                <button
                  onClick={() => updatePhaseStatus(currentPhase.id, 'in_progress')}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Reabrir
                </button>
              )}
            </div>
          </div>

          <ChecklistSection phase={currentPhase} projectId={id} onUpdate={load} />
        </div>
      )}

      {/* Events / Calendar */}
      <EventsSection projectId={id} events={events} onUpdate={load} />

      {/* Link to expediente */}
      {project.contact_id && (
        <div className="mt-4 text-center">
          <a
            href={`/contacts/${project.contact_id}`}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Ver expediente completo del cliente →
          </a>
        </div>
      )}
    </div>
  );
}
