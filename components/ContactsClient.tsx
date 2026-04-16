'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Contact, ContactStatus } from '@/lib/types';
import NuevoClienteForm from './NuevoClienteForm';

const STATUS_LABELS: Record<ContactStatus, string> = {
  lead: 'Lead',
  prospect: 'Prospecto',
  customer: 'Cliente',
  inactive: 'Inactivo',
};

const STATUS_COLORS: Record<ContactStatus, string> = {
  lead: 'bg-blue-50 text-blue-600 border border-blue-100',
  prospect: 'bg-amber-50 text-amber-600 border border-amber-100',
  customer: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  inactive: 'bg-slate-50 text-slate-500 border border-slate-100',
};

const AVATAR_COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500', 'bg-orange-500', 'bg-cyan-500'];

const EMPTY_FORM = { name: '', email: '', phone: '', company: '', city: '', status: 'lead' as ContactStatus };

function Avatar({ name, idx }: { name: string; idx: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
      {initials}
    </div>
  );
}

export default function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ContactStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(contact: Contact) {
    setEditing(contact);
    setForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      city: contact.city || '',
      status: contact.status,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/contacts/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este cliente?')) return;
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    load();
  }

  const filtered = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.client_code || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: contacts.length,
    lead: contacts.filter(c => c.status === 'lead').length,
    prospect: contacts.filter(c => c.status === 'prospect').length,
    customer: contacts.filter(c => c.status === 'customer').length,
    inactive: contacts.filter(c => c.status === 'inactive').length,
  };

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clientes</h1>
          <p className="text-slate-500 mt-1">{contacts.length} expedientes registrados</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo cliente
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(['all', 'customer', 'prospect', 'lead', 'inactive'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {s === 'all' ? 'Todos' : STATUS_LABELS[s]} ({counts[s]})
          </button>
        ))}
        <div className="ml-auto">
          <input
            type="text"
            placeholder="Buscar por nombre, empresa o codigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-72"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-slate-500 font-medium">No se encontraron contactos</p>
            <p className="text-slate-400 text-sm mt-1">Prueba con otro filtro o agrega un contacto nuevo.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide bg-slate-50/80">
                <th className="px-6 py-3.5">Expediente</th>
                <th className="px-6 py-3.5">Cliente</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Teléfono</th>
                <th className="px-6 py-3.5">Ciudad</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c, i) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1 font-mono text-xs font-bold text-indigo-700">
                      {c.client_code || 'CLI-????'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} idx={i} />
                      <div>
                        <p className="font-semibold text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.company || 'Sin empresa cargada'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{c.email}</td>
                  <td className="px-6 py-4 text-slate-600">{c.phone || '—'}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {c.city ? (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">📍</span> {c.city}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/contacts/${c.id}`} className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold">
                        Expediente
                      </Link>
                      <button onClick={() => openEdit(c)} className="text-slate-500 hover:text-slate-700 text-xs font-semibold">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && !editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <NuevoClienteForm onClose={() => { setShowModal(false); load(); }} />
        </div>
      )}

      {showModal && editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg">Editar cliente</h2>
              <button onClick={() => { setShowModal(false); setEditing(null); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="text-xs font-medium text-indigo-600">Expediente</p>
                <p className="font-mono text-sm font-bold text-indigo-800">{editing.client_code || 'CLI-????'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre completo</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                  <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Empresa</label>
                  <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ciudad</label>
                  <input placeholder="Ej: Madrid, Barcelona..." value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estado</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContactStatus })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent">
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-400">El expediente se mantiene fijo. Solo editamos los datos del cliente.</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); }}
                  className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
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
