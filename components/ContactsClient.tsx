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
  lead: 'border border-blue-100 bg-blue-50 text-blue-600',
  prospect: 'border border-amber-100 bg-amber-50 text-amber-600',
  customer: 'border border-emerald-100 bg-emerald-50 text-emerald-600',
  inactive: 'border border-slate-100 bg-slate-50 text-slate-500',
};

const AVATAR_COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-emerald-500', 'bg-orange-500', 'bg-cyan-500'];

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  company: '',
  city: '',
  address: '',
  status: 'lead' as ContactStatus,
};

function Avatar({ name, idx }: { name: string; idx: number }) {
  const initials = name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
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

  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition';

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/contacts');
      const result = await response.json();
      setContacts(Array.isArray(result) ? result : []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
      address: contact.address || '',
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

  const filtered = contacts.filter((contact) => {
    const query = search.toLowerCase();
    const matchSearch =
      contact.name.toLowerCase().includes(query) ||
      contact.company.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query) ||
      (contact.city || '').toLowerCase().includes(query) ||
      (contact.client_code || '').toLowerCase().includes(query);

    const matchStatus = filterStatus === 'all' || contact.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: contacts.length,
    lead: contacts.filter((contact) => contact.status === 'lead').length,
    prospect: contacts.filter((contact) => contact.status === 'prospect').length,
    customer: contacts.filter((contact) => contact.status === 'customer').length,
    inactive: contacts.filter((contact) => contact.status === 'inactive').length,
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clientes</h1>
          <p className="mt-1 text-slate-500">{contacts.length} expedientes registrados</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo cliente
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'customer', 'prospect', 'lead', 'inactive'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterStatus === status
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {status === 'all' ? 'Todos' : STATUS_LABELS[status]} ({counts[status]})
          </button>
        ))}

        <div className="ml-auto">
          <input
            type="text"
            placeholder="Buscar por nombre, empresa o codigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mb-3 text-4xl">Contactos</div>
            <p className="font-medium text-slate-500">No se encontraron contactos</p>
            <p className="mt-1 text-sm text-slate-400">Prueba con otro filtro o agrega un contacto nuevo.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3.5">Expediente</th>
                <th className="px-6 py-3.5">Cliente</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Telefono</th>
                <th className="px-6 py-3.5">Ciudad</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((contact, index) => (
                <tr key={contact.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1 font-mono text-xs font-bold text-indigo-700">
                      {contact.client_code || 'CLI-????'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={contact.name} idx={index} />
                      <div>
                        <p className="font-semibold text-slate-800">{contact.name}</p>
                        <p className="text-xs text-slate-500">{contact.company || 'Sin empresa cargada'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{contact.email || '—'}</td>
                  <td className="px-6 py-4 text-slate-700">{contact.phone || '—'}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {contact.city ? (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">📍</span>
                        {contact.city}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[contact.status]}`}>
                      {STATUS_LABELS[contact.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/contacts/${contact.id}`} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100">
                        Expediente
                      </Link>
                      <button onClick={() => openEdit(contact)} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(contact.id)} className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100">
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

      {showModal && !editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <NuevoClienteForm
            onClose={() => {
              setShowModal(false);
              load();
            }}
          />
        </div>
      )}

      {showModal && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-800">Editar cliente</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="text-xs font-medium text-indigo-600">Expediente</p>
                <p className="font-mono text-sm font-bold text-indigo-800">{editing.client_code || 'CLI-????'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nombre completo</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Telefono</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Empresa</label>
                  <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Opcional" className={inputClass} />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ciudad</label>
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ej. Mejicanos" className={inputClass} />
                </div>

                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Dirección</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Referencia, colonia, calle o ubicación" className={inputClass} />
                </div>

                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Estado</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContactStatus })} className={inputClass}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-xs text-slate-500">El expediente se mantiene fijo. Aquí sí editas claramente los datos guardados del cliente.</p>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditing(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
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
