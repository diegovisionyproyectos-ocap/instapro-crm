'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FormData {
  // Client
  name: string;
  phone: string;
  email: string;
  company: string;
  city: string;
  // Project
  project_title: string;
  project_value: string;
  close_date: string;
  notes: string;
}

const EMPTY: FormData = {
  name: '', phone: '', email: '', company: '', city: '',
  project_title: '', project_value: '', close_date: '', notes: '',
};

export default function NuevoClienteForm({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(EMPTY);
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // 1. Create contact
      const cRes = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          city: form.city.trim(),
          status: 'prospect',
        }),
      });
      const contact = await cRes.json();
      if (!cRes.ok || contact.error) throw new Error(contact.error || 'Error al crear contacto');

      // 2. Create deal in 'following' stage
      const dRes = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.project_title.trim() || `Proyecto - ${form.name.trim()}`,
          contact_id: contact.id,
          contact_name: contact.name,
          stage: 'following',
          value: parseFloat(form.project_value) || 0,
          close_date: form.close_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          notes: form.notes.trim(),
        }),
      });
      const deal = await dRes.json();
      if (!dRes.ok || deal.error) throw new Error(deal.error || 'Error al crear seguimiento');

      // Done — go to pipeline
      onClose?.();
      router.push('/pipeline');
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  const input = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-300';
  const label = 'block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide';

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="px-7 pt-6 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Nuevo Cliente</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {step === 1 ? 'Datos del cliente' : 'Datos del proyecto'}
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mt-4">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-indigo-600 text-white' :
                s < step ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {s < step ? '✓' : s}
              </div>
              <span className={`text-xs font-medium ${step === s ? 'text-slate-700' : 'text-slate-400'}`}>
                {s === 1 ? 'Cliente' : 'Proyecto'}
              </span>
              {s < 2 && <div className="w-8 h-px bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmit}>
        <div className="px-7 py-6 space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className={label}>Nombre completo *</label>
                <input
                  required
                  autoFocus
                  placeholder="Ej. Juan Pérez"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={input}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Teléfono</label>
                  <input
                    placeholder="+54 11 1234-5678"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    className={input}
                  />
                </div>
                <div>
                  <label className={label}>Ciudad</label>
                  <input
                    placeholder="Buenos Aires"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    className={input}
                  />
                </div>
              </div>
              <div>
                <label className={label}>Empresa / Razón social</label>
                <input
                  placeholder="Nombre de la empresa (opcional)"
                  value={form.company}
                  onChange={(e) => set('company', e.target.value)}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Email</label>
                <input
                  type="email"
                  placeholder="email@empresa.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={input}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={label}>Descripción del proyecto *</label>
                <input
                  required
                  autoFocus
                  placeholder="Ej. Instalación eléctrica edificio norte"
                  value={form.project_title}
                  onChange={(e) => set('project_title', e.target.value)}
                  className={input}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Valor estimado (USD)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.project_value}
                    onChange={(e) => set('project_value', e.target.value)}
                    className={input}
                  />
                </div>
                <div>
                  <label className={label}>Fecha estimada de cierre</label>
                  <input
                    type="date"
                    value={form.close_date}
                    onChange={(e) => set('close_date', e.target.value)}
                    className={input}
                  />
                </div>
              </div>
              <div>
                <label className={label}>Notas adicionales</label>
                <textarea
                  rows={3}
                  placeholder="Detalles del proyecto, requisitos especiales..."
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  className={input + ' resize-none'}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-7 pb-6 flex gap-3">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              ← Atrás
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            {step === 1 ? 'Continuar →' : saving ? 'Guardando...' : '✓ Crear y agregar al seguimiento'}
          </button>
        </div>
      </form>
    </div>
  );
}
