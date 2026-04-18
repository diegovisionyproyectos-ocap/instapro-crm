'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContactStatus } from '@/lib/types';

type ClientMode = 'person' | 'company';
type CompanyRelation = 'none' | 'belongs';

interface ContactFormState {
  mode: ClientMode;
  relation: CompanyRelation;
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  address: string;
  status: ContactStatus;
}

const EMPTY_CONTACT: ContactFormState = {
  mode: 'person',
  relation: 'none',
  name: '',
  email: '',
  phone: '',
  company: '',
  city: '',
  address: '',
  status: 'prospect',
};

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'prospect', label: 'Prospecto' },
  { value: 'customer', label: 'Cliente' },
  { value: 'inactive', label: 'Inactivo' },
];

export default function NuevoClienteForm({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<ContactFormState>(EMPTY_CONTACT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdContact, setCreatedContact] = useState<{ id: string; client_code: string; name: string } | null>(null);

  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition';
  const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600';

  function patch<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function relationLabel() {
    if (form.mode === 'company') return 'Razón social o nombre comercial *';
    return 'Nombre completo del cliente *';
  }

  function relationHelp() {
    if (form.mode === 'company') return 'Este expediente será una empresa como cliente principal.';
    if (form.relation === 'belongs') return 'Puedes vincular este cliente a una empresa sin perder sus datos personales.';
    return 'Este expediente será una persona sin empresa asociada.';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      company: form.mode === 'company'
        ? form.name.trim()
        : form.relation === 'belongs'
          ? form.company.trim()
          : '',
      city: form.city.trim(),
      address: form.address.trim() || null,
      status: form.status,
    };

    if (!payload.name || !payload.phone || !payload.city) {
      setError('Completa nombre, teléfono y ciudad para crear el cliente.');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'No se pudo crear el cliente.');
      }

      setCreatedContact({
        id: result.id,
        client_code: result.client_code,
        name: result.name,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setSaving(false);
    }
  }

  function goToExpediente(withProject = false) {
    if (!createdContact) return;
    onClose?.();
    const suffix = withProject ? '?newProject=1' : '';
    router.push(`/contacts/${createdContact.id}${suffix}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 px-7 py-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Nuevo cliente</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registra primero el expediente del cliente y luego, si quieres, creamos su proyecto con los datos ya vinculados.
          </p>
        </div>
        {onClose && !createdContact && (
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {!createdContact ? (
        <form onSubmit={handleSubmit} className="px-7 py-6">
          <div className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4">
            <p className="text-sm font-semibold text-indigo-800">Flujo recomendado</p>
            <p className="mt-1 text-sm text-indigo-700">
              1. Creas el cliente o empresa.
              2. Se genera su expediente único.
              3. Desde el expediente puedes abrir el formulario de proyecto sin volver a escribir los datos del cliente.
            </p>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => patch('mode', 'person')}
              className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                form.mode === 'person'
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">Persona</p>
              <p className="mt-1 text-xs text-slate-500">Cliente individual, encargado o contacto principal.</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setForm((current) => ({
                  ...current,
                  mode: 'company',
                  relation: 'none',
                  company: '',
                }));
              }}
              className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                form.mode === 'company'
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">Empresa</p>
              <p className="mt-1 text-xs text-slate-500">El cliente principal será una razón social o nombre comercial.</p>
            </button>
          </div>

          {form.mode === 'person' && (
            <div className="mb-5">
              <label className={labelClass}>¿Este cliente pertenece a una empresa?</label>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => patch('relation', 'none')}
                  className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                    form.relation === 'none'
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">No</p>
                  <p className="mt-1 text-xs text-slate-500">Es un cliente individual.</p>
                </button>
                <button
                  type="button"
                  onClick={() => patch('relation', 'belongs')}
                  className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                    form.relation === 'belongs'
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">Sí</p>
                  <p className="mt-1 text-xs text-slate-500">Guardar también la empresa a la que pertenece.</p>
                </button>
              </div>
            </div>
          )}

          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700">{relationHelp()}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass}>{relationLabel()}</label>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => patch('name', e.target.value)}
                placeholder={form.mode === 'company' ? 'Ej. InstaPro Constructora S.A.' : 'Ej. Carlos Nunfio'}
                className={inputClass}
              />
            </div>

            {form.mode === 'person' && form.relation === 'belongs' && (
              <div className="md:col-span-2">
                <label className={labelClass}>Empresa asociada *</label>
                <input
                  required
                  value={form.company}
                  onChange={(e) => patch('company', e.target.value)}
                  placeholder="Ej. Grupo Instrapro"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className={labelClass}>Teléfono *</label>
              <input
                required
                value={form.phone}
                onChange={(e) => patch('phone', e.target.value)}
                placeholder="+503 0000-0000"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Correo electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => patch('email', e.target.value)}
                placeholder="correo@cliente.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Ciudad *</label>
              <input
                required
                value={form.city}
                onChange={(e) => patch('city', e.target.value)}
                placeholder="Ej. Mejicanos"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Estado del cliente</label>
              <select
                value={form.status}
                onChange={(e) => patch('status', e.target.value as ContactStatus)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Dirección</label>
              <input
                value={form.address}
                onChange={(e) => patch('address', e.target.value)}
                placeholder="Colonia, calle, número de casa o ubicación de referencia"
                className={inputClass}
              />
            </div>

          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Guardando cliente...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      ) : (
        <div className="px-7 py-8">
          <div className="mb-6 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">Cliente creado correctamente</h3>
              <p className="text-sm text-emerald-800">
                Ya se generó el expediente <span className="font-mono font-bold">{createdContact.client_code}</span> para {createdContact.name}.
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm font-semibold text-slate-800">¿Harás un proyecto para este cliente ahora?</p>
            <p className="mt-1 text-sm text-slate-600">
              Si eliges que sí, te llevaré al expediente con el formulario de proyecto ya vinculado a este cliente o empresa.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <button
              onClick={() => goToExpediente(false)}
              className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              No, solo ir al expediente
            </button>
            <button
              onClick={() => goToExpediente(true)}
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
            >
              Sí, crear proyecto ahora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

