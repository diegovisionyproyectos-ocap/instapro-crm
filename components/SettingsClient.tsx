'use client';

import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function SettingsClient() {
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.from('settings').select('key, value').in('key', ['logo_url', 'company_name']).then(({ data }) => {
      if (!data) return;
      data.forEach(row => {
        if (row.key === 'logo_url') setLogoUrl(row.value || null);
        if (row.key === 'company_name') setCompanyName(row.value || '');
      });
    });
  }, []);

  const upsertSetting = async (key: string, value: string) => {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const ext = file.name.split('.').pop();
    const path = `logo/company-logo.${ext}`;

    const { error: uploadError } = await supabase.storage.from('assets').upload(path, file, { upsert: true });
    if (uploadError) {
      setError('Error al subir el logo: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('assets').getPublicUrl(path);
    const url = data.publicUrl + '?t=' + Date.now();
    setLogoUrl(url);
    await upsertSetting('logo_url', url);
    setUploading(false);
  };

  const handleSaveName = async () => {
    setSaving(true);
    await upsertSetting('company_name', companyName);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRemoveLogo = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.storage.from('assets').remove(['logo/company-logo.png', 'logo/company-logo.jpg', 'logo/company-logo.webp']);
    await upsertSetting('logo_url', '');
    setLogoUrl(null);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-500 text-sm mt-1">Personaliza tu empresa y el sistema</p>
      </div>

      {/* Company identity */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-700 mb-5">Identidad de la empresa</h2>

        {/* Logo */}
        <div className="flex items-center gap-6 mb-6 pb-6 border-b border-slate-100">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 mb-1">Logo de la empresa</p>
            <p className="text-xs text-slate-400 mb-3">PNG, JPG o WebP. Se muestra en el sidebar.</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {uploading ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold rounded-lg transition-colors"
                >
                  Eliminar
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>

        {/* Company name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la empresa</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Tu Empresa S.A."
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Seguridad</h2>
        <div className="flex items-center justify-between py-3 border-b border-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-700">Acceso protegido</p>
            <p className="text-xs text-slate-400 mt-0.5">Solo usuarios autorizados pueden ingresar al sistema</p>
          </div>
          <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full border border-green-200">Activo</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Rol actual</p>
            <p className="text-xs text-slate-400 mt-0.5">Tenés acceso completo al sistema</p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full border border-indigo-200">Super Admin</span>
        </div>
      </div>
    </div>
  );
}
