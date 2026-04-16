'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClientData {
  name: string;
  phone: string;
  email: string;
  company: string;
  city: string;
  address: string;
}

interface ProjectData {
  project_title: string;
  project_value: string;
  close_date: string;
  notes: string;
}

const EMPTY_CLIENT: ClientData = { name: '', phone: '', email: '', company: '', city: '', address: '' };
const EMPTY_PROJECT: ProjectData = { project_title: '', project_value: '', close_date: '', notes: '' };

export default function NuevoClienteForm({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [client, setClient] = useState<ClientData>(EMPTY_CLIENT);
  const [project, setProject] = useState<ProjectData>(EMPTY_PROJECT);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [createdContact, setCreatedContact] = useState<{ id: string; client_code: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setC(field: keyof ClientData, value: string) {
    setClient(f => ({ ...f, [field]: value }));
  }
  function setP(field: keyof ProjectData, value: string) {
    setProject(f => ({ ...f, [field]: value }));
  }

  async function handleClientSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const cRes = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: client.name.trim(),
          phone: client.phone.trim(),
          email: client.email.trim(),
          company: client.company.trim(),
          city: client.city.trim(),
          address: client.address.trim() || null,
          status: 'prospect',
        }),
      });
      const contact = await cRes.json();
      if (!cRes.ok || contact.error) throw new Error(contact.error || 'Error al crear cliente');

      setCreatedContact({ id: contact.id, client_code: contact.client_code, name: contact.name });
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  async function handleProjectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createdContact) return;
    setSaving(true);
    setError('');

    try {
      const dRes = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.project_title.trim() || `Proyecto - ${createdContact.name}`,
          contact_id: createdContact.id,
          contact_name: createdContact.name,
          stage: 'following',
          value: parseFloat(project.project_value) || 0,
          close_date: project.close_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          notes: project.notes.trim(),
        }),
      });
      const deal = await dRes.json();
      if (!dRes.ok || deal.error) throw new Error(deal.error || 'Error al crear proyecto');

      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  function handleSkipProject() {
    setStep(3);
  }

  function handleGoToExpediente() {
    if (!createdContact) return;
    onClose?.();
    router.push(`/contacts/${createdContact.id}`);
  }

  function handleGoToPipeline() {
    onClose?.();
    router.push('/pipeline');
  }

  const inp = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-300 transition';
  const lbl = 'block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide';

  const steps = [
    { n: 1, label: 'Cliente' },
    { n: 2, label: 'Proyecto' },
    { n: 3, label: 'Listo' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="px-7 pt-6 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Nuevo Cliente</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {step === 1 && 'Registrá los datos del cliente'}
              {step === 2 && 'Agregá el primer proyecto (opcional)'}
              {step === 3 && 'Cliente creado correctamente'}
            </p>
          </div>
          {onClose && step !== 3 && (
            <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s.n ? 'bg-indigo-600 text-white' :
                s.n < step ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {s.n < step ? '✓' : s.n}
              </div>
              <span className={`text-xs font-medium ${step === s.n ? 'text-slate-700' : 'text-slate-400'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className="w-6 h-px bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1 — Client data */}
      {step === 1 && (
        <form onSubmit={handleClientSubmit}>
          <div className="px-7 py-6 space-y-4">
            <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <p className="text-xs text-indigo-700 font-medium">
                Al crear el cliente se genera automáticamente su <strong>código único de expediente</strong> (CLI-XXXX) que vincula todos sus proyectos, eventos y facturas.
              </p>
            </div>

            <div>
              <label className={lbl}>Nombre completo *</label>
              <input required autoFocus placeholder="Ej. Juan Pérez"
                value={client.name} onChange={e => setC('name', e.target.value)} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Teléfono</label>
                <input placeholder="+54 11 1234-5678"
                  value={client.phone} onChange={e => setC('phone', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Ciudad</label>
                <input placeholder="Buenos Aires"
                  value={client.city} onChange={e => setC('city', e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <label className={lbl}>Dirección del cliente</label>
              <input placeholder="Av. Corrientes 1234, CABA"
                value={client.address} onChange={e => setC('address', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Empresa / Razón social</label>
              <input placeholder="Nombre de la empresa (opcional)"
                value={client.company} onChange={e => setC('company', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input type="email" placeholder="email@empresa.com"
                value={client.email} onChange={e => setC('email', e.target.value)} className={inp} />
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">{error}</div>
            )}
          </div>
          <div className="px-7 pb-6">
            <button type="submit" disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm">
              {saving ? 'Creando cliente...' : 'Crear cliente y continuar →'}
            </button>
          </div>
        </form>
      )}

      {/* Step 2 — First project */}
      {step === 2 && createdContact && (
        <form onSubmit={handleProjectSubmit}>
          <div className="px-7 py-5 space-y-4">
            {/* Client code badge */}
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-emerald-700 font-semibold">{createdContact.name}</p>
                <p className="text-xs text-emerald-600">
                  Expediente <span className="font-bold font-mono">{createdContact.client_code}</span> creado ✓
                </p>
              </div>
            </div>

            <div>
              <label className={lbl}>Descripción del proyecto</label>
              <input autoFocus placeholder="Ej. Instalación eléctrica edificio norte"
                value={project.project_title} onChange={e => setP('project_title', e.target.value)} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Valor estimado ($)</label>
                <input type="number" min="0" placeholder="0"
                  value={project.project_value} onChange={e => setP('project_value', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Fecha estimada cierre</label>
                <input type="date" value={project.close_date} onChange={e => setP('close_date', e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <label className={lbl}>Notas</label>
              <textarea rows={2} placeholder="Detalles del proyecto..."
                value={project.notes} onChange={e => setP('notes', e.target.value)}
                className={inp + ' resize-none'} />
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">{error}</div>
            )}
          </div>
          <div className="px-7 pb-6 flex gap-3">
            <button type="button" onClick={handleSkipProject}
              className="flex-1 border border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
              Agregar después
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm">
              {saving ? 'Guardando...' : 'Agregar proyecto →'}
            </button>
          </div>
        </form>
      )}

      {/* Step 3 — Done */}
      {step === 3 && createdContact && (
        <div className="px-7 py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">{createdContact.name}</h3>
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 mb-5">
            <span className="text-xs text-indigo-500 font-medium">Código de expediente</span>
            <span className="text-indigo-700 font-bold font-mono text-base">{createdContact.client_code}</span>
          </div>
          <p className="text-slate-500 text-sm mb-6">
            Desde el expediente del cliente podés ver todos sus proyectos, eventos y el historial completo.
          </p>
          <div className="flex gap-3">
            <button onClick={handleGoToPipeline}
              className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
              Ver pipeline
            </button>
            <button onClick={handleGoToExpediente}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors shadow-sm">
              Ver expediente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
