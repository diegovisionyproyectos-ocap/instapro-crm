'use client';

import { useEffect, useState } from 'react';
import type { Contact, Deal, DealStage } from '@/lib/types';

const STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: 'prospecting', label: 'Prospección', color: 'bg-slate-100 border-slate-300' },
  { key: 'qualification', label: 'Calificación', color: 'bg-blue-50 border-blue-200' },
  { key: 'proposal', label: 'Propuesta', color: 'bg-purple-50 border-purple-200' },
  { key: 'negotiation', label: 'Negociación', color: 'bg-yellow-50 border-yellow-200' },
  { key: 'closed-won', label: 'Ganado', color: 'bg-green-50 border-green-200' },
  { key: 'closed-lost', label: 'Perdido', color: 'bg-red-50 border-red-200' },
];

const EMPTY_FORM = {
  title: '',
  contact_id: '',
  contact_name: '',
  stage: 'prospecting' as DealStage,
  value: 0,
  close_date: '',
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function DealsClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [dealsRes, contactsRes] = await Promise.all([
      fetch('/api/deals'),
      fetch('/api/contacts'),
    ]);
    setDeals(await dealsRes.json());
    setContacts(await contactsRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(deal: Deal) {
    setEditing(deal);
    setForm({
      title: deal.title,
      contact_id: deal.contact_id,
      contact_name: deal.contact_name,
      stage: deal.stage,
      value: deal.value,
      close_date: deal.close_date,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const contact = contacts.find((c) => c.id === form.contact_id);
    const payload = { ...form, contact_name: contact?.name || form.contact_name };
    if (editing) {
      await fetch(`/api/deals/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este negocio?')) return;
    await fetch(`/api/deals/${id}`, { method: 'DELETE' });
    load();
  }

  async function moveStage(deal: Deal, stage: DealStage) {
    await fetch(`/api/deals/${deal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...deal, stage }),
    });
    load();
  }

  const totalOpen = deals
    .filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost')
    .reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pipeline de Negocios</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {deals.length} negocios · {fmt(totalOpen)} en curso
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo negocio
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Cargando...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(({ key, label, color }) => {
            const stageDeals = deals.filter((d) => d.stage === key);
            const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <div key={key} className="w-64 shrink-0">
                <div className={`rounded-xl border-2 ${color} p-3`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</span>
                    <span className="text-xs text-slate-500 font-medium">{stageDeals.length}</span>
                  </div>
                  {stageTotal > 0 && (
                    <p className="text-xs text-slate-500 mb-3">{fmt(stageTotal)}</p>
                  )}
                  <div className="space-y-2 min-h-[4rem]">
                    {stageDeals.map((deal) => (
                      <div key={deal.id} className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
                        <p className="font-medium text-slate-800 text-sm leading-snug">{deal.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{deal.contact_name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold text-indigo-600">{fmt(deal.value)}</span>
                          <span className="text-xs text-slate-400">{deal.close_date}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                          <button
                            onClick={() => openEdit(deal)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(deal.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                        <div className="mt-2">
                          <select
                            value={deal.stage}
                            onChange={(e) => moveStage(deal, e.target.value as DealStage)}
                            className="text-xs w-full border border-slate-200 rounded px-1 py-0.5 text-slate-600 focus:outline-none"
                          >
                            {STAGES.map(({ key: sk, label: sl }) => (
                              <option key={sk} value={sk}>{sl}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <p className="text-xs text-center text-slate-300 py-4">Sin negocios</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                {editing ? 'Editar negocio' : 'Nuevo negocio'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título del negocio</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contacto</label>
                <select
                  required
                  value={form.contact_id}
                  onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">Seleccionar contacto...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Etapa</label>
                  <select
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value as DealStage })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {STAGES.map(({ key: sk, label: sl }) => (
                      <option key={sk} value={sk}>{sl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valor (€)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de cierre</label>
                <input
                  type="date"
                  required
                  value={form.close_date}
                  onChange={(e) => setForm({ ...form, close_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
