import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNav from '../components/AppNav';
import ItemsTable from '../components/ItemsTable';
import PdfViewer from '../components/PdfViewer';
import { generarPDF, downloadPdfBytes, calcTotales } from '../utils/pdfGenerator';
import { saveCotizacion, encodeDataForUrl, saveDraft, loadDraft, clearDraft } from '../utils/storage';

const DEFAULT_ITEMS = [{ descripcion: '', cantidad: 1, precioUnitario: '' }];

const today = () => {
  const d = new Date();
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
};

const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
};

const DEFAULT_FORM = {
  fechaEmision:  today(),
  validaHasta:   plusDays(10),
  vendedor:      'Diego Martínez',
  clienteNombre: '',
  clienteDireccion: '',
  clienteTelefono: '',
  clienteCorreo:  '',
  clienteNRC:    '',
  descuento:     '0',
  incluyeIVA:    true,
  condicionesPago: '50% anticipo / 50% contra entrega',
  fechaInstalacion: '10 días hábiles a partir de su aprobación',
  notas: '',
};

export default function FormPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [previewBytes, setPreviewBytes] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [draftStatus, setDraftStatus] = useState(''); // 'saved' | 'restored' | ''
  const previewRef = useRef(null);
  const saveTimer = useRef(null);

  // Restore draft on mount
  const [form, setForm] = useState(() => {
    const draft = loadDraft();
    if (draft) return { ...DEFAULT_FORM, ...draft };
    return DEFAULT_FORM;
  });

  const [items, setItems] = useState(() => {
    const draft = loadDraft();
    return draft?._items || DEFAULT_ITEMS;
  });

  // Auto-save draft on every change (debounced 800ms)
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft({ ...form, _items: items });
      setDraftStatus('saved');
      setTimeout(() => setDraftStatus(''), 2000);
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [form, items]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const setCheck = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.checked }));

  function clearForm() {
    if (!confirm('¿Limpiar todo el formulario y empezar de cero?')) return;
    clearDraft();
    setForm({ ...DEFAULT_FORM, fechaEmision: today(), validaHasta: plusDays(10) });
    setItems(DEFAULT_ITEMS);
    setPreviewBytes(null);
    setShowPreview(false);
    setGeneratedLink('');
  }

  async function handlePreview() {
    setLoading(true);
    try {
      const bytes = await generarPDF({ ...form, items });
      setPreviewBytes(bytes);
      setShowPreview(true);
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      console.error(e);
      alert('Error al generar la vista previa. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerarLink() {
    setLoading(true);
    try {
      const id = saveCotizacion({ ...form, items });
      const encoded = encodeDataForUrl({ ...form, items, id });
      const baseUrl = window.location.origin + window.location.pathname;
      const link = `${baseUrl}#/cotizacion/${encoded}`;
      setGeneratedLink(link);
    } catch (e) {
      console.error(e);
      alert('Error al generar el link.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDescargar() {
    setLoading(true);
    try {
      const bytes = await generarPDF({ ...form, items });
      const nombre = form.clienteNombre || 'cotizacion';
      downloadPdfBytes(bytes, `Cotizacion_InstaPro_${nombre.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error al descargar el PDF.');
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(`Hola, te comparto tu cotización: ${generatedLink}`);
    const phone = (form.clienteTelefono || '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }

  const { total } = calcTotales(items, parseFloat(form.descuento) || 0);
  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      {/* Top bar */}
      <div className="bg-instapro-blue text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-instapro-yellow rounded-full flex items-center justify-center text-instapro-blue font-bold text-lg">I</div>
          <div>
            <p className="font-bold text-lg leading-tight">INSTAPRO</p>
            <p className="text-xs opacity-70">Sistema de Cotizaciones</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Draft indicator */}
          {draftStatus === 'saved' && (
            <span className="text-xs bg-white/15 text-white/90 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Borrador guardado
            </span>
          )}
          <button
            onClick={clearForm}
            className="text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/50 px-3 py-1.5 rounded-lg transition"
          >
            Limpiar formulario
          </button>
          <div className="text-right text-sm opacity-80">
            <p>instaprosv@gmail.com</p>
            <p>(503) 7054-7633</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Encabezado ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-4 border-b border-instapro-lightblue pb-2">
            📋 Datos de la Cotización
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Fecha de emisión" value={form.fechaEmision} onChange={set('fechaEmision')} />
            <Field label="Válida hasta" value={form.validaHasta} onChange={set('validaHasta')} />
            <Field label="Vendedor" value={form.vendedor} onChange={set('vendedor')} />
          </div>
        </div>

        {/* ── Datos del cliente ───────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-4 border-b border-instapro-lightblue pb-2">
            👤 Datos del Cliente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre completo *" value={form.clienteNombre} onChange={set('clienteNombre')} placeholder="Nombre del cliente" />
            <Field label="Dirección" value={form.clienteDireccion} onChange={set('clienteDireccion')} placeholder="Dirección completa" />
            <Field label="Teléfono" value={form.clienteTelefono} onChange={set('clienteTelefono')} placeholder="+503 0000-0000" />
            <Field label="Correo electrónico" value={form.clienteCorreo} onChange={set('clienteCorreo')} placeholder="correo@ejemplo.com" type="email" />
            <Field label="NRC" value={form.clienteNRC} onChange={set('clienteNRC')} placeholder="(opcional)" />
          </div>
        </div>

        {/* ── Productos ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-4 border-b border-instapro-lightblue pb-2">
            🛍️ Productos / Servicios
          </h2>
          <div className="mb-4 flex flex-wrap items-end gap-6">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Descuento (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.descuento}
                onChange={set('descuento')}
                className="w-32 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-instapro-blue"
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.incluyeIVA}
                  onChange={setCheck('incluyeIVA')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-instapro-blue" />
              </label>
              <span className="text-sm text-gray-700 font-medium">
                Incluir IVA (13%)
              </span>
              {!form.incluyeIVA && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                  El total no incluye impuesto
                </span>
              )}
            </div>
          </div>
          <ItemsTable items={items} onChange={setItems} descuento={form.descuento} incluyeIVA={form.incluyeIVA} />
        </div>

        {/* ── Condiciones ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-4 border-b border-instapro-lightblue pb-2">
            📝 Condiciones y Notas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Condiciones de pago" value={form.condicionesPago} onChange={set('condicionesPago')} />
            <Field label="Fecha de instalación estimada" value={form.fechaInstalacion} onChange={set('fechaInstalacion')} />
          </div>
          <div className="mt-4">
            <label className="text-sm text-gray-600 mb-1 block">Notas adicionales</label>
            <textarea
              rows={3}
              value={form.notas}
              onChange={set('notas')}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-instapro-blue resize-none"
              placeholder="Notas adicionales para el cliente…"
            />
          </div>
        </div>

        {/* ── Acciones ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-4 border-b border-instapro-lightblue pb-2">
            🚀 Acciones
          </h2>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handlePreview}
              disabled={loading}
              className="bg-instapro-blue text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-900 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? '⏳' : '👁️'} Vista previa PDF
            </button>
            <button
              onClick={handleDescargar}
              disabled={loading}
              className="bg-gray-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-900 transition disabled:opacity-50 flex items-center gap-2"
            >
              ⬇️ Descargar PDF
            </button>
            <button
              onClick={handleGenerarLink}
              disabled={loading}
              className="bg-instapro-yellow text-instapro-blue px-5 py-2.5 rounded-lg font-bold hover:bg-yellow-400 transition disabled:opacity-50 flex items-center gap-2"
            >
              🔗 Generar link
            </button>
          </div>

          {/* Generated link */}
          {generatedLink && (
            <div className="bg-instapro-lightblue rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-instapro-blue">✅ Link generado</p>
              <div className="flex gap-2 items-center">
                <input
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-white border border-blue-200 rounded px-3 py-2 text-xs text-gray-700 font-mono overflow-hidden"
                />
                <button
                  onClick={copyLink}
                  className="bg-instapro-blue text-white px-3 py-2 rounded text-sm hover:bg-blue-900 transition whitespace-nowrap"
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <div className="flex gap-3 flex-wrap">
                <a
                  href={generatedLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-instapro-blue underline hover:text-blue-900"
                >
                  Abrir vista del cliente →
                </a>
                <button
                  onClick={shareWhatsApp}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition flex items-center gap-2"
                >
                  <WhatsAppIcon /> Enviar por WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Preview ─────────────────────────────────────────────── */}
        {showPreview && previewBytes && (
          <div ref={previewRef} className="bg-white rounded-xl shadow p-6">
            <h2 className="text-instapro-blue font-bold text-lg mb-4 border-b border-instapro-lightblue pb-2">
              👁️ Vista Previa
            </h2>
            <PdfViewer pdfBytes={previewBytes} />
          </div>
        )}

      </div>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-instapro-blue"
      />
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
