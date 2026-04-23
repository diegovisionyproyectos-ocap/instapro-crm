'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type UserRow = { id: string; email: string; role: string; created_at: string; last_sign_in_at?: string };
const EMPTY_USER = { email: '', password: '', role: 'team' };

export default function SettingsClient() {
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Users management
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState('');

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSaving(true);
    setUserError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userForm),
    });
    const data = await res.json();
    if (!res.ok) { setUserError(data.error || 'Error al crear usuario'); setUserSaving(false); return; }
    setUserSaving(false);
    setShowAddUser(false);
    setUserForm(EMPTY_USER);
    loadUsers();
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`¿Eliminar el usuario ${email}?`)) return;
    await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadUsers();
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.from('settings').select('key, value').in('key', ['logo_url', 'company_name']).then(({ data }) => {
      if (!data) return;
      data.forEach(row => {
        if (row.key === 'logo_url') setLogoUrl(row.value || null);
        if (row.key === 'company_name') setCompanyName(row.value || '');
      });
    });
    loadUsers();
  }, [loadUsers]);

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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
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

      {/* Users */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-700">Usuarios</h2>
            <p className="text-xs text-slate-400 mt-0.5">Gestioná quién puede acceder al sistema</p>
          </div>
          <button
            onClick={() => { setShowAddUser(!showAddUser); setUserError(''); setUserForm(EMPTY_USER); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Agregar usuario
          </button>
        </div>

        {/* Add user form */}
        {showAddUser && (
          <form onSubmit={handleAddUser} className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">Nuevo usuario</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email" required value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="usuario@empresa.com"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña</label>
                <input
                  type="password" required value={userForm.password} minLength={6}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
              <select
                value={userForm.role}
                onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="admin">Admin — acceso completo</option>
                <option value="team">Equipo — acceso al cotizador y vistas</option>
              </select>
            </div>
            {userError && (
              <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{userError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAddUser(false)}
                className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2 text-xs font-semibold hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={userSaving}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2 text-xs font-semibold transition-colors disabled:opacity-50">
                {userSaving ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        )}

        {/* Users list */}
        {usersLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No hay usuarios registrados</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-indigo-600">
                    {u.email?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{u.email}</p>
                  <p className="text-xs text-slate-400">
                    {u.last_sign_in_at
                      ? `Último acceso: ${new Date(u.last_sign_in_at).toLocaleDateString('es-AR')}`
                      : 'Nunca ingresó'}
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                  u.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
                }`}>
                  {u.role === 'admin' ? 'Admin' : 'Equipo'}
                </span>
                <button
                  onClick={() => handleDeleteUser(u.id, u.email)}
                  className="text-red-400 hover:text-red-600 transition-colors shrink-0 p-1 rounded-lg hover:bg-red-50"
                  title="Eliminar usuario"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
          Para que funcione la gestión de usuarios, asegurate de tener <code className="font-mono bg-slate-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> configurada en las variables de entorno de Vercel.
        </p>
      </div>
    </div>
  );
}
