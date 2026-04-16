'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProjectData {
  client_name: string; // Nombre del cliente o encargado
  contact_phone: string; // Contacto telefónico
  contact_email: string; // Correo electrónico
  project_description: string; // Descripción del proyecto
  area_measurement: string; // Área en metros cuadrados o lineales
  project_value: string; // Valor del proyecto
  tentative_date: string; // Fecha tentativa de realización
  notes: string; // Notas adicionales
}

const EMPTY_PROJECT: ProjectData = {
  client_name: '',
  contact_phone: '',
  contact_email: '',
  project_description: '',
  area_measurement: '',
  project_value: '',
  tentative_date: '',
  notes: ''
};

export default function NuevoClienteForm({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectData>(EMPTY_PROJECT);
  const [step, setStep] = useState<1 | 2>(1);
  const [createdContact, setCreatedContact] = useState<{ id: string; client_code: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setP(field: keyof ProjectData, value: string) {
    setProject(f => ({ ...f, [field]: value }));
  }

  async function handleProjectSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Crear el contacto primero
      const cRes = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: project.client_name.trim(),
          phone: project.contact_phone.trim(),
          email: project.contact_email.trim(),
          company: '',
          city: '',
          address: '',
          status: 'prospect',
        }),
      });
      const contact = await cRes.json();
      if (!cRes.ok || contact.error) throw new Error(contact.error || 'Error al crear cliente');

      // Crear el proyecto/deal
      const dRes = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.project_description.trim() || `Proyecto - ${project.client_name}`,
          contact_id: contact.id,
          contact_name: project.client_name,
          stage: 'following',
          value: parseFloat(project.project_value) || 0,
          close_date: project.tentative_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          notes: `Área: ${project.area_measurement}\n${project.notes}`.trim(),
        }),
      });
      const deal = await dRes.json();
      if (!dRes.ok || deal.error) throw new Error(deal.error || 'Error al crear proyecto');

      setCreatedContact({ id: contact.id, client_code: contact.client_code, name: project.client_name });
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
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
    { n: 1, label: 'Proyecto' },
    { n: 2, label: 'Listo' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="px-7 pt-6 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Nuevo Proyecto</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {step === 1 && 'Registrá los datos del proyecto y cliente'}
              {step === 2 && 'Proyecto creado correctamente'}
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

      {/* Step 1 — Project data */}
      {step === 1 && (
        <form onSubmit={handleProjectSubmit}>
          <div className="px-7 py-6 space-y-4">
            <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-xs text-indigo-700 font-medium">
                Al crear el proyecto se genera automáticamente el <strong>cliente</strong> y su <strong>código único de expediente</strong> (CLI-XXXX) que vincula todos sus proyectos.
              </p>
            </div>

            <div>
              <label className={lbl}>Nombre del cliente o encargado *</label>
              <input required autoFocus placeholder="Ej. Juan Pérez o María García (Encargada)"
                value={project.client_name} onChange={e => setP('client_name', e.target.value)} className={inp} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Teléfono de contacto *</label>
                <input required placeholder="+54 11 1234-5678"
                  value={project.contact_phone} onChange={e => setP('contact_phone', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Correo electrónico</label>
                <input type="email" placeholder="email@cliente.com"
                  value={project.contact_email} onChange={e => setP('contact_email', e.target.value)} className={inp} />
              </div>
            </div>

            <div>
              <label className={lbl}>Descripción del proyecto *</label>
              <textarea required rows={2} placeholder="Ej. Instalación eléctrica completa en edificio de 3 pisos, incluyendo tableros principales y circuitos secundarios"
                value={project.project_description} onChange={e => setP('project_description', e.target.value)}
                className={inp + ' resize-none'} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Área / Medida (m² o lineales)</label>
                <input placeholder="Ej. 150 m² o 200 lineales"
                  value={project.area_measurement} onChange={e => setP('area_measurement', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Valor estimado del proyecto ($)</label>
                <input type="number" min="0" placeholder="0"
                  value={project.project_value} onChange={e => setP('project_value', e.target.value)} className={inp} />
              </div>
            </div>

            <div>
              <label className={lbl}>Fecha tentativa de realización</label>
              <input type="date" value={project.tentative_date} onChange={e => setP('tentative_date', e.target.value)} className={inp} />
            </div>

            <div>
              <label className={lbl}>Notas adicionales</label>
              <textarea rows={2} placeholder="Detalles adicionales, requerimientos especiales, observaciones..."
                value={project.notes} onChange={e => setP('notes', e.target.value)}
                className={inp + ' resize-none'} />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">{error}</div>
            )}
          </div>
          <div className="px-7 pb-6">
            <button type="submit" disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm">
              {saving ? 'Creando proyecto...' : 'Crear proyecto →'}
            </button>
          </div>
        </form>
      )}

      {/* Step 2 — Done */}
      {step === 2 && createdContact && (
        <div className="px-7 py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Proyecto creado exitosamente</h3>
          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-slate-600 mb-1"><strong>Cliente:</strong> {createdContact.name}</p>
            <p className="text-sm text-slate-600 mb-1"><strong>Proyecto:</strong> {project.project_description}</p>
            {project.area_measurement && <p className="text-sm text-slate-600 mb-1"><strong>Área:</strong> {project.area_measurement}</p>}
            {project.project_value && <p className="text-sm text-slate-600"><strong>Valor:</strong> ${parseFloat(project.project_value).toLocaleString('es-AR')}</p>}
          </div>
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
