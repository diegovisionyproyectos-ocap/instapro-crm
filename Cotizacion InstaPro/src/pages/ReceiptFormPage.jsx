import { useState, useRef } from 'react';
import AppNav from '../components/AppNav';
import InstaProLogo from '../components/InstaProLogo';
import PdfViewer from '../components/PdfViewer';
import { generarReciboPDF, downloadReciboPdfBytes, calcTotalesRecibo } from '../utils/receiptGenerator';
import { saveRecibo, encodeDataForUrl } from '../utils/storage';

const today = () => {
  const d = new Date();
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const DEFAULT_ITEMS = [{ descripcion: '', cantidad: 1, precioUnitario: '' }];

export default function ReceiptFormPage() {
  const [loading, setLoading]       = useState(false);
  const [previewBytes, setPreviewBytes] = useState(null);
  const [showPreview, setShowPreview]   = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied]         = useState(false);
  const previewRef = useRef(null);

  const [items, setItems] = useState(DEFAULT_ITEMS);

  const [form, setForm] = useState({
    fechaEmision:      today(),
    vendedor:          'Diego Martínez',
    clienteNombre:     '',
    clienteDireccion:  '',
    clienteTelefono:   '',
    clienteCorreo:     '',
    clienteNRC:        '',
    anticipoPct:       '50',
    fechaInstalacion:  plusDays(10),
    horaAsignada:      '',
    ubicacionServicio: '',
    firmaFecha:        today(),
  });

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const datos = { ...form, items };
  const { subtotal, anticipo, valorPendiente, total } =
    calcTotalesRecibo(items, parseFloat(form.anticipoPct) || 50);
  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  async function handlePreview() {
    setLoading(true);
    try {
      const bytes = await generarReciboPDF(datos);
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

  async function handleDescargar() {
    setLoading(true);
    try {
      const bytes = await generarReciboPDF(datos);
      const nombre = form.clienteNombre || 'recibo';
      downloadReciboPdfBytes(bytes, `Recibo_InstaPro_${nombre.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error al descargar el PDF.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerarLink() {
    setLoading(true);
    try {
      const id = saveRecibo(datos);
      const encoded = encodeDataForUrl({ ...datos, id });
      const baseUrl = window.location.origin + window.location.pathname;
      const link = `${baseUrl}#/recibo/${encoded}`;
      setGeneratedLink(link);
    } catch (e) {
      console.error(e);
      alert('Error al generar el link.');
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
    const msg = encodeURIComponent(`Hola, te comparto tu recibo de pago: ${generatedLink}`);
    const phone = (form.clienteTelefono || '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      {/* Top bar */}
      <div className="bg-instapro-blue text-white px-6 py-4 flex items-center justify-between shadow">
        <InstaProLogo subtitle="Sistema de Recibos de Pago" compact />
        <div className="text-right text-sm opacity-80">
          <p>instaprosv@gmail.com</p>
          <p>(503) 7054-7633</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Encabezado ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-4 border-b border-instapro-lightblue pb-2">
            🧾 Datos del Recibo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Fecha de emisión" value={form.fechaEmision} onChange={set('fechaEmision')} />
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

        {/* ── Ítems ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-4 border-b border-instapro-lightblue pb-2">
            🛍️ Productos / Servicios
          </h2>

          <div className="mb-4 flex items-center gap-4">
            <label className="text-sm text-gray-600">Anticipo (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.anticipoPct}
              onChange={set('anticipoPct')}
              className="w-24 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-instapro-blue"
            />
            <span className="text-xs text-gray-400">
              Se calcula el anticipo por ítem en el PDF
            </span>
          </div>

          <ReceiptItemsTable items={items} onChange={setItems} anticipoPct={parseFloat(form.anticipoPct) || 50} />
        </div>

        {/* ── Información de Instalación ──────────────────────────── */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-instapro-blue font-bold text-lg mb-4 border-b border-instapro-lightblue pb-2">
            🔧 Información de Instalación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Fecha de instalación" value={form.fechaInstalacion} onChange={set('fechaInstalacion')} placeholder="dd/mm/yyyy o ej: 10 días hábiles" />
            <Field label="Hora asignada" value={form.horaAsignada} onChange={set('horaAsignada')} placeholder="ej: 09:00 AM" />
            <Field label="Ubicación del servicio" value={form.ubicacionServicio} onChange={set('ubicacionServicio')} placeholder="Dirección del servicio" />
            <Field label="Fecha de firma" value={form.firmaFecha} onChange={set('firmaFecha')} />
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

// ── Tabla de ítems para recibo (máx 3) ────────────────────────────────────────

function ReceiptItemsTable({ items, onChange, anticipoPct }) {
  const MAX_ROWS = 3;
  const fmt = (n) => `$${Number(n).toFixed(2)}`;

  function updateItem(index, field, value) {
    onChange(items.map((it, i) => i === index ? { ...it, [field]: value } : it));
  }

  function addItem() {
    if (items.length < MAX_ROWS) {
      onChange([...items, { descripcion: '', cantidad: 1, precioUnitario: '' }]);
    }
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  const subtotal       = items.reduce((s, it) =>
    s + (parseFloat(it.precioUnitario) || 0) * (parseFloat(it.cantidad) || 0), 0);
  const anticipo       = subtotal * anticipoPct / 100;
  const valorPendiente = subtotal - anticipo;

  return (
    <div className="space-y-3">
      {/* Encabezado tabla */}
      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-white bg-instapro-blue rounded px-2 py-2">
        <div className="col-span-5">Descripción</div>
        <div className="col-span-2 text-center">Cantidad</div>
        <div className="col-span-2 text-right">Precio servicio</div>
        <div className="col-span-2 text-right">Anticipo ({anticipoPct}%)</div>
        <div className="col-span-1"></div>
      </div>

      {/* Filas */}
      {items.map((item, i) => {
        const rowSub      = (parseFloat(item.precioUnitario) || 0) * (parseFloat(item.cantidad) || 0);
        const rowAnticipo = rowSub * anticipoPct / 100;
        return (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input
              className="col-span-5 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-instapro-blue"
              placeholder={`Ítem ${i + 1}`}
              value={item.descripcion}
              onChange={e => updateItem(i, 'descripcion', e.target.value)}
            />
            <input
              className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-instapro-blue"
              type="number"
              min="1"
              placeholder="1"
              value={item.cantidad}
              onChange={e => updateItem(i, 'cantidad', e.target.value)}
            />
            <div className="col-span-2 relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                className="w-full border border-gray-300 rounded pl-5 pr-2 py-1.5 text-sm text-right focus:outline-none focus:border-instapro-blue"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={item.precioUnitario}
                onChange={e => updateItem(i, 'precioUnitario', e.target.value)}
              />
            </div>
            <div className="col-span-2 text-right text-sm font-medium text-gray-700">
              {rowAnticipo > 0 ? fmt(rowAnticipo) : '—'}
            </div>
            <div className="col-span-1 flex justify-center">
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none"
                  title="Eliminar ítem"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}

      {items.length < MAX_ROWS && (
        <button
          type="button"
          onClick={addItem}
          className="text-instapro-blue text-sm font-medium hover:underline flex items-center gap-1"
        >
          + Agregar ítem
        </button>
      )}

      {/* Resumen de totales */}
      <div className="mt-4 border-t pt-4 space-y-1 text-sm max-w-xs ml-auto">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-orange-600">
          <span>Anticipo ({anticipoPct}%)</span>
          <span className="font-medium">{fmt(anticipo)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Valor pendiente</span>
          <span className="font-medium">{fmt(valorPendiente)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-instapro-blue border-t pt-2 mt-2">
          <span>TOTAL</span>
          <span>{fmt(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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
