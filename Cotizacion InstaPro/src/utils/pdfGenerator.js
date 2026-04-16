import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import defaultCoords from './pdfCoords.json';
import { getStoredCoords } from './coordsStorage';

// ─────────────────────────────────────────────────────────────────────────────
//  Las coordenadas se editan en la herramienta de calibración:
//  http://localhost:5173/#/calibrar
//
//  Sistema de coordenadas pdf-lib: origen (0,0) en esquina INFERIOR-IZQUIERDA
//  Página A4 = 595.5 × 842.25 puntos
// ─────────────────────────────────────────────────────────────────────────────

// Todos los campos calibrables tienen formato { x, y }
// Los ítems usan x = inicio de la descripción
// itemCantRX / itemPriceRX / itemSubRX = borde derecho de cada columna numérica

export const CAMPO_COORDS = defaultCoords;

// Metadatos para la herramienta de calibración
export const CAMPOS_META = [
  { key: 'fechaEmision',    label: 'Fecha de emisión',    color: '#e74c3c', group: 'Encabezado' },
  { key: 'validaHasta',     label: 'Válida hasta',        color: '#e67e22', group: 'Encabezado' },
  { key: 'vendedor',        label: 'Vendedor',            color: '#f1c40f', group: 'Encabezado' },
  { key: 'clienteNombre',   label: 'Nombre cliente',      color: '#2ecc71', group: 'Cliente' },
  { key: 'clienteDireccion',label: 'Dirección',           color: '#1abc9c', group: 'Cliente' },
  { key: 'clienteTelefono', label: 'Teléfono',            color: '#3498db', group: 'Cliente' },
  { key: 'clienteCorreo',   label: 'Correo',              color: '#9b59b6', group: 'Cliente' },
  { key: 'clienteNRC',      label: 'NRC',                 color: '#e91e63', group: 'Cliente' },
  { key: 'item1',           label: 'Ítem 1',              color: '#00bcd4', group: 'Ítems' },
  { key: 'item2',           label: 'Ítem 2',              color: '#009688', group: 'Ítems' },
  { key: 'item3',           label: 'Ítem 3',              color: '#4caf50', group: 'Ítems' },
  { key: 'item4',           label: 'Ítem 4',              color: '#8bc34a', group: 'Ítems' },
  { key: 'subtotalR',       label: 'Subtotal',            color: '#ff9800', group: 'Totales' },
  { key: 'descuentoLabel',  label: 'Descuento label',     color: '#ff7043', group: 'Totales' },
  { key: 'descuentoMontoR', label: 'Descuento monto',     color: '#ff5722', group: 'Totales' },
  { key: 'subtotalDescR',   label: 'Subtotal c/dto',      color: '#795548', group: 'Totales' },
  { key: 'ivaR',            label: 'IVA',                 color: '#607d8b', group: 'Totales' },
  { key: 'totalR',          label: 'TOTAL',               color: '#c0392b', group: 'Totales' },
  { key: 'firmaNombre',     label: 'Nombre en firma',     color: '#8e44ad', group: 'Firma' },
  { key: 'firmaNombreLeft', label: 'Firma nombre inicio', color: '#16a085', group: 'Firma' },
  { key: 'firmaNombreRight',label: 'Firma nombre fin',    color: '#2980b9', group: 'Firma' },
  { key: 'firmaFecha',      label: 'Fecha de firma',      color: '#34495e', group: 'Firma' },
  { key: 'firmaImagen',     label: 'Firma (imagen)',       color: '#d35400', group: 'Firma' },
];

// ─── Helper: Cargar fuente personalizada ───────────────────────────────────
async function cargarFuentePersonalizada(pdfDoc) {
  try {
    pdfDoc.registerFontkit(fontkit);

    // Usa la variante regular local de Bricolage Grotesque para el PDF.
    const response = await fetch('fonts/Bricolage_Grotesque/static/BricolageGrotesque-Regular.ttf');
    if (response.ok) {
      const fontBytes = await response.arrayBuffer();
      return await pdfDoc.embedFont(fontBytes);
    }
  } catch (e) {
    // Silencio - fallback
  }
  // Fallback a Helvetica
  return await pdfDoc.embedFont(StandardFonts.Helvetica);
}

function formatSignatureDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Generación del PDF ───────────────────────────────────────────────────────

export async function generarPDF(datos, firmaDataUrl = null) {
  // Siempre carga las coords más recientes (en desarrollo el JSON cambia por HMR)
  let coords;
  const storedCoords = getStoredCoords('cotizacion');

  if (storedCoords) {
    coords = storedCoords;
  } else {
    try {
      const res = await fetch('/api/coords');
      coords = res.ok ? await res.json() : defaultCoords;
    } catch {
      coords = defaultCoords;
    }
  }

  const templateBytes = await fetch('plantilla.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page   = pdfDoc.getPages()[0];

  const fontCustom = await cargarFuentePersonalizada(pdfDoc);
  const fontStd    = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const SZ  = 7.5;
  const SZS = 7;
  const CLIENT_SIZE = 10;
  const DESC_SIZE = 10;
  const DARK  = rgb(0.08, 0.08, 0.08);
  const BRAND_BLUE = rgb(1 / 255, 21 / 255, 88 / 255);
  const WHITE = rgb(1, 1, 1);

  // Offset de ajuste para todas las coordenadas Y (puedes editarlo en pdfCoords.json)
  const adjustY = coords._adjustmentY || 0;

  const draw = (text, x, y, { size = SZ, color = DARK, bold = false, font = null } = {}) => {
    const s = String(text ?? '');
    if (!s) return;
    page.drawText(s, { x, y: y + adjustY, font: font || fontCustom, size, color });
  };

  const drawR = (text, rightX, y, { size = SZ, color = DARK, bold = false, font = null } = {}) => {
    const s = String(text ?? '');
    if (!s) return;
    const f = font || fontCustom;
    page.drawText(s, { x: rightX - f.widthOfTextAtSize(s, size), y: y + adjustY, font: f, size, color });
  };

  const drawCentered = (text, centerX, y, { size = SZ, color = DARK, font = null } = {}) => {
    const s = String(text ?? '').trim();
    if (!s) return;
    const f = font || fontCustom;
    const width = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: centerX - (width / 2), y: y + adjustY, font: f, size, color });
  };

  const drawCenteredFit = (
    text,
    centerX,
    y,
    { targetSize, minSize = 8, maxWidth, color = DARK, font = null } = {}
  ) => {
    const s = String(text ?? '').trim();
    if (!s) return;
    const f = font || fontCustom;
    let size = targetSize;

    while (size > minSize && f.widthOfTextAtSize(s, size) > maxWidth) {
      size -= 0.25;
    }

    drawCentered(s, centerX, y, { size, color, font: f });
  };

  // ── Encabezado
  draw(datos.fechaEmision,   coords.fechaEmision.x,    coords.fechaEmision.y);
  draw(datos.validaHasta,    coords.validaHasta.x,     coords.validaHasta.y);
  draw(datos.vendedor,       coords.vendedor.x,        coords.vendedor.y);

  // ── Cliente
  draw(datos.clienteNombre,    coords.clienteNombre.x,    coords.clienteNombre.y, { size: CLIENT_SIZE });
  draw(datos.clienteDireccion, coords.clienteDireccion.x, coords.clienteDireccion.y, { size: CLIENT_SIZE });
  draw(datos.clienteTelefono,  coords.clienteTelefono.x,  coords.clienteTelefono.y, { size: CLIENT_SIZE });
  draw(datos.clienteCorreo,    coords.clienteCorreo.x,    coords.clienteCorreo.y, { size: CLIENT_SIZE });
  draw(datos.clienteNRC,       coords.clienteNRC.x,       coords.clienteNRC.y, { size: CLIENT_SIZE });

  // ── Ítems
  const items = datos.items || [];
  const filas  = [coords.item1, coords.item2, coords.item3, coords.item4];
  const cantRX  = coords.itemCantRX  || 337;
  const priceRX = coords.itemPriceRX || 445;
  const priceCX = coords.itemPriceCX || 436;
  const subRX   = coords.itemSubRX   || 533;

  for (let i = 0; i < Math.min(items.length, 4); i++) {
    const it  = items[i];
    const row = filas[i];
    if (!it?.descripcion || !row) continue;

    const d = it.descripcion;
    if (d.length > 36) {
      draw(d.slice(0, 36),  row.x, row.y + 5, { size: DESC_SIZE });
      draw(d.slice(36, 72), row.x, row.y - 3, { size: DESC_SIZE });
    } else {
      draw(d, row.x, row.y, { size: DESC_SIZE });
    }

    const qty   = String(it.cantidad || '');
    const price = parseFloat(it.precioUnitario || 0);
    const sub   = price * parseFloat(it.cantidad || 1);

    drawCentered(qty, cantRX, row.y);
    drawCentered(fmt(price), priceCX, row.y);
    drawR(fmt(sub),   subRX,   row.y);
  }

  // ── Totales
  const subtotal     = calcSubtotal(items);
  const descPct      = parseFloat(datos.descuento || 0);
  const descMonto    = subtotal * descPct / 100;
  const subtotalDesc = subtotal - descMonto;
  const iva          = subtotalDesc * 0.13;
  const total        = subtotalDesc + iva;

  drawR(fmt(subtotal),     coords.subtotalR.x,     coords.subtotalR.y);
  if (descPct > 0) {
    drawCentered(`${descPct}%`, coords.descuentoLabel.x, coords.descuentoLabel.y, {
      size: 10,
      color: BRAND_BLUE,
    });
  }
  drawR(fmt(descMonto),    coords.descuentoMontoR.x,  coords.descuentoMontoR.y);
  drawR(fmt(subtotalDesc), coords.subtotalDescR.x,    coords.subtotalDescR.y);
  drawR(fmt(iva),          coords.ivaR.x,             coords.ivaR.y);
  drawR(fmt(total),        coords.totalR.x,           coords.totalR.y, { bold: true, color: WHITE });

  // ── Firma
  if (firmaDataUrl) {
    try {
      const b64   = firmaDataUrl.replace(/^data:image\/png;base64,/, '');
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const img   = await pdfDoc.embedPng(bytes);
      const fi    = coords.firmaImagen;
      const fitScale = Math.min((fi.w * 0.9) / img.width, (fi.h * 0.8) / img.height);
      const drawW = img.width * fitScale;
      const drawH = img.height * fitScale;
      const drawX = fi.x + ((fi.w - drawW) / 2);
      const drawY = fi.y + ((fi.h - drawH) / 2);

      page.drawImage(img, { x: drawX, y: drawY, width: drawW, height: drawH });
    } catch (e) {
      console.warn('Error al insertar firma:', e);
    }
  }

  if (datos.clienteNombre) {
    const firmaLeftX = coords.firmaNombreLeft?.x ?? coords.firmaNombre?.x ?? 0;
    const firmaRightX = coords.firmaNombreRight?.x ?? coords.firmaNombre?.x ?? firmaLeftX;
    const firmaCenterX = (firmaLeftX + firmaRightX) / 2;
    const firmaMaxWidth = Math.max(Math.abs(firmaRightX - firmaLeftX), 40);

    drawCenteredFit(datos.clienteNombre, firmaCenterX, coords.firmaNombre.y, {
      targetSize: 13,
      minSize: 9,
      maxWidth: firmaMaxWidth,
      color: BRAND_BLUE,
    });
  }

  const signatureDate = formatSignatureDate(datos.firmadoAt || (firmaDataUrl ? new Date().toISOString() : ''));
  if (signatureDate && coords.firmaFecha) {
    draw(signatureDate, coords.firmaFecha.x, coords.firmaFecha.y, {
      size: 8.5,
      color: BRAND_BLUE,
    });
  }

  return await pdfDoc.save();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n) { return `$${Number(n).toFixed(2)}`; }

export function calcSubtotal(items = []) {
  return items.reduce((s, it) =>
    s + (parseFloat(it.precioUnitario) || 0) * (parseFloat(it.cantidad) || 0), 0);
}

export function calcTotales(items = [], pct = 0) {
  const subtotal     = calcSubtotal(items);
  const descMonto    = subtotal * pct / 100;
  const subtotalDesc = subtotal - descMonto;
  const iva          = subtotalDesc * 0.13;
  const total        = subtotalDesc + iva;
  return { subtotal, descMonto, subtotalDesc, iva, total };
}

export function downloadPdfBytes(bytes, filename = 'cotizacion.pdf') {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
