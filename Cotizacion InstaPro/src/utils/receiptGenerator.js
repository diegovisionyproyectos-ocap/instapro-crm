import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import defaultCoords from './receiptCoords.json';

export const RECIBO_COORDS = defaultCoords;

// Campos que coinciden con el template recibo_pago.pdf
export const RECIBO_CAMPOS_META = [
  // Encabezado
  { key: 'fechaEmision',      label: 'Fecha de emisión',       color: '#e74c3c', group: 'Encabezado' },
  { key: 'vendedor',          label: 'Vendedor',               color: '#e67e22', group: 'Encabezado' },
  // Cliente
  { key: 'clienteNombre',     label: 'Nombre',                 color: '#f1c40f', group: 'Cliente' },
  { key: 'clienteDireccion',  label: 'Dirección',              color: '#2ecc71', group: 'Cliente' },
  { key: 'clienteTelefono',   label: 'Teléfono',               color: '#1abc9c', group: 'Cliente' },
  { key: 'clienteCorreo',     label: 'Correo',                 color: '#3498db', group: 'Cliente' },
  { key: 'clienteNRC',        label: 'NRC',                    color: '#9b59b6', group: 'Cliente' },
  // Ítems (3 filas)
  { key: 'item1',             label: 'Ítem 1',                 color: '#00bcd4', group: 'Ítems' },
  { key: 'item2',             label: 'Ítem 2',                 color: '#009688', group: 'Ítems' },
  { key: 'item3',             label: 'Ítem 3',                 color: '#4caf50', group: 'Ítems' },
  { key: 'itemCantidad',      label: 'Cantidad',               color: '#f39c12', group: 'Ítems' },
  { key: 'itemPrecio',        label: 'Precio servicio',        color: '#8e44ad', group: 'Ítems' },
  { key: 'itemAnticipo',      label: 'Anticipo',               color: '#27ae60', group: 'Ítems' },
  // Totales
  { key: 'subtotalR',         label: 'Subtotal',               color: '#ff9800', group: 'Totales' },
  { key: 'anticipoR',         label: 'Anticipo del 50%',       color: '#ff7043', group: 'Totales' },
  { key: 'valorPendienteR',   label: 'Valor pendiente',        color: '#ff5722', group: 'Totales' },
  { key: 'totalR',            label: 'TOTAL',                  color: '#c0392b', group: 'Totales' },
  // Instalación
  { key: 'fechaInstalacion',  label: 'Fecha de instalación',   color: '#8e44ad', group: 'Instalación' },
  { key: 'horaAsignada',      label: 'Hora asignada',          color: '#16a085', group: 'Instalación' },
  { key: 'ubicacionServicio', label: 'Ubicación del servicio', color: '#2980b9', group: 'Instalación' },
  // Firma
  { key: 'firmaNombre',       label: 'Nombre firma',           color: '#8e44ad', group: 'Firma' },
  { key: 'firmaNombreLeft',   label: 'Firma inicio',           color: '#16a085', group: 'Firma' },
  { key: 'firmaNombreRight',  label: 'Firma fin',              color: '#2980b9', group: 'Firma' },
  { key: 'firmaFecha',        label: 'Fecha firma',            color: '#34495e', group: 'Firma' },
  { key: 'firmaImagen',       label: 'Firma imagen',           color: '#d35400', group: 'Firma' },
];

// ─── Helpers internos ─────────────────────────────────────────────────────────

async function cargarFuente(pdfDoc, fontPath) {
  try {
    pdfDoc.registerFontkit(fontkit);
    const response = await fetch(fontPath);
    if (response.ok) {
      const fontBytes = await response.arrayBuffer();
      return await pdfDoc.embedFont(fontBytes);
    }
  } catch (_) { /* fallback */ }
  return await pdfDoc.embedFont(StandardFonts.Helvetica);
}

function fmt(n) { return `$${Number(n).toFixed(2)}`; }

function splitTextToFit(text, font, size, maxWidth, maxLines = 2) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines = [];
  let currentLine = '';
  let index = 0;

  while (index < words.length && lines.length < maxLines) {
    const word = words[index];
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
      index += 1;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = '';
      continue;
    }

    let chunk = word;
    while (font.widthOfTextAtSize(chunk, size) > maxWidth && chunk.length > 1) {
      chunk = chunk.slice(0, -1);
    }
    lines.push(chunk);
    words[index] = word.slice(chunk.length).trim();
    if (!words[index]) index += 1;
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (index < words.length && lines.length) {
    let lastLine = lines[lines.length - 1];
    if (!lastLine.endsWith('…')) {
      while (font.widthOfTextAtSize(`${lastLine}…`, size) > maxWidth && lastLine.length > 1) {
        lastLine = lastLine.slice(0, -1).trimEnd();
      }
      lines[lines.length - 1] = `${lastLine}…`;
    }
  }

  return lines;
}

export function calcTotalesRecibo(items = [], anticipoPct = 50) {
  const subtotal        = items.reduce((s, it) =>
    s + (parseFloat(it.precioUnitario) || 0) * (parseFloat(it.cantidad) || 0), 0);
  const anticipo        = subtotal * anticipoPct / 100;
  const valorPendiente  = subtotal - anticipo;
  const total           = subtotal;
  return { subtotal, anticipo, valorPendiente, total };
}

// ─── Generación del PDF ───────────────────────────────────────────────────────

export async function generarReciboPDF(datos, firmaDataUrl = null) {
  let coords;
  try {
    const res = await fetch('/api/coords?type=recibo');
    coords = res.ok ? await res.json() : defaultCoords;
  } catch {
    coords = defaultCoords;
  }

  const templateBytes = await fetch('/recibo_pago.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page   = pdfDoc.getPages()[0];

  const font = await cargarFuente(
    pdfDoc,
    '/fonts/Bricolage_Grotesque/static/BricolageGrotesque-Regular.ttf',
  );
  const DARK       = rgb(0.08, 0.08, 0.08);
  const BRAND_BLUE = rgb(1 / 255, 21 / 255, 88 / 255);
  const WHITE      = rgb(1, 1, 1);
  const adjustY    = coords._adjustmentY || 0;
  const HEADER_SZ = 5.9;
  const CLIENT_SZ = 4.6;
  const ITEM_SZ = 6;
  const TOTAL_SZ = 6;
  const SIGNATURE_SZ = 6.4;
  const INSTALLATION_SZ = 5.4;
  const DEFAULT_SZ = ITEM_SZ;

  const draw = (text, x, y, { size = DEFAULT_SZ, color = DARK, fontOverride = font } = {}) => {
    const s = String(text ?? '').trim();
    if (!s) return;
    page.drawText(s, { x, y: y + adjustY, font: fontOverride, size, color });
  };

  const drawR = (text, rightX, y, { size = DEFAULT_SZ, color = DARK, fontOverride = font } = {}) => {
    const s = String(text ?? '').trim();
    if (!s) return;
    page.drawText(s, {
      x: rightX - fontOverride.widthOfTextAtSize(s, size),
      y: y + adjustY,
      font: fontOverride,
      size,
      color,
    });
  };

  const drawCentered = (text, centerX, y, { size = DEFAULT_SZ, color = DARK, fontOverride = font } = {}) => {
    const s = String(text ?? '').trim();
    if (!s) return;
    const w = fontOverride.widthOfTextAtSize(s, size);
    page.drawText(s, { x: centerX - w / 2, y: y + adjustY, font: fontOverride, size, color });
  };

  const drawCenteredFit = (
    text,
    centerX,
    y,
    { targetSize = SIGNATURE_SZ, minSize = 5.4, maxWidth = 200, color = DARK, fontOverride = font } = {},
  ) => {
    const s = String(text ?? '').trim();
    if (!s) return;
    let size = targetSize;
    while (size > minSize && fontOverride.widthOfTextAtSize(s, size) > maxWidth) size -= 0.25;
    drawCentered(s, centerX, y, { size, color, fontOverride });
  };

  // ── Encabezado
  draw(datos.fechaEmision, coords.fechaEmision.x, coords.fechaEmision.y, { size: HEADER_SZ });
  draw(datos.vendedor,     coords.vendedor.x,     coords.vendedor.y,     { size: HEADER_SZ });

  // ── Datos del cliente
  draw(datos.clienteNombre,    coords.clienteNombre.x,    coords.clienteNombre.y,    { size: CLIENT_SZ });
  draw(datos.clienteDireccion, coords.clienteDireccion.x, coords.clienteDireccion.y, { size: CLIENT_SZ });
  draw(datos.clienteTelefono,  coords.clienteTelefono.x,  coords.clienteTelefono.y,  { size: CLIENT_SZ });
  draw(datos.clienteCorreo,    coords.clienteCorreo.x,    coords.clienteCorreo.y,    { size: CLIENT_SZ });
  draw(datos.clienteNRC,       coords.clienteNRC.x,       coords.clienteNRC.y,       { size: CLIENT_SZ });

  // ── Ítems (3 filas)
  const items = datos.items || [];
  const filas = [coords.item1, coords.item2, coords.item3];
  const anticipoPct = parseFloat(datos.anticipoPct ?? 50);
  const cantX       = coords.itemCantidad?.x
    ?? (typeof coords.itemCantRX === 'number' ? coords.itemCantRX : coords.itemCantRX?.x)
    ?? 375;
  const precioRX    = coords.itemPrecio?.x
    ?? (typeof coords.itemPrecioRX === 'number' ? coords.itemPrecioRX : coords.itemPrecioRX?.x)
    ?? 470;
  const anticipoRX  = coords.itemAnticipo?.x
    ?? (typeof coords.itemAnticipoRX === 'number' ? coords.itemAnticipoRX : coords.itemAnticipoRX?.x)
    ?? 558;
  for (let i = 0; i < Math.min(items.length, 3); i++) {
    const it  = items[i];
    const row = filas[i];
    if (!it?.descripcion || !row) continue;

    const descLines = splitTextToFit(it.descripcion, font, ITEM_SZ, Math.max(cantX - row.x - 18, 80), 2);
    if (descLines.length > 1) {
      draw(descLines[0], row.x, row.y + 4, { size: ITEM_SZ, fontOverride: font });
      draw(descLines[1], row.x, row.y - 3, { size: ITEM_SZ, fontOverride: font });
    } else if (descLines[0]) {
      draw(descLines[0], row.x, row.y, { size: ITEM_SZ, fontOverride: font });
    }

    const qty      = String(it.cantidad || '');
    const precio   = parseFloat(it.precioUnitario || 0);
    const subtotal = precio * parseFloat(it.cantidad || 1);
    const anticipo = subtotal * anticipoPct / 100;

    drawCentered(qty,         cantX,       row.y, { size: ITEM_SZ, fontOverride: font });
    drawR(fmt(precio),        precioRX,    row.y, { size: ITEM_SZ, fontOverride: font });
    drawR(fmt(anticipo),      anticipoRX,  row.y, { size: ITEM_SZ, fontOverride: font });
  }

  // ── Totales
  const { subtotal, anticipo, valorPendiente, total } = calcTotalesRecibo(items, anticipoPct);

  drawR(fmt(subtotal),       coords.subtotalR.x,       coords.subtotalR.y,       { size: TOTAL_SZ, fontOverride: font });
  drawR(fmt(anticipo),       coords.anticipoR.x,       coords.anticipoR.y,       { size: TOTAL_SZ, fontOverride: font });
  drawR(fmt(valorPendiente), coords.valorPendienteR.x, coords.valorPendienteR.y, { size: TOTAL_SZ, fontOverride: font });
  drawR(fmt(total),          coords.totalR.x,          coords.totalR.y,          { size: TOTAL_SZ, color: WHITE, fontOverride: font });

  // ── Info instalación
  if (coords.fechaInstalacion)  draw(datos.fechaInstalacion,  coords.fechaInstalacion.x,  coords.fechaInstalacion.y,  { size: INSTALLATION_SZ });
  if (coords.horaAsignada)      draw(datos.horaAsignada,      coords.horaAsignada.x,      coords.horaAsignada.y,      { size: INSTALLATION_SZ });
  if (coords.ubicacionServicio) draw(datos.ubicacionServicio, coords.ubicacionServicio.x, coords.ubicacionServicio.y, { size: INSTALLATION_SZ });

  // ── Firma – nombre centrado
  const nombreFirma = datos.firmaNombre || datos.clienteNombre || '';
  if (nombreFirma && coords.firmaNombre) {
    const leftX   = coords.firmaNombreLeft?.x  ?? coords.firmaNombre.x;
    const rightX  = coords.firmaNombreRight?.x ?? coords.firmaNombre.x;
    const centerX = (leftX + rightX) / 2;
    const maxW    = Math.max(Math.abs(rightX - leftX), 40);

    drawCenteredFit(nombreFirma, centerX, coords.firmaNombre.y, {
      targetSize: SIGNATURE_SZ, minSize: 5.4, maxWidth: maxW, color: BRAND_BLUE,
    });
  }

  if (datos.firmaFecha && coords.firmaFecha) {
    draw(datos.firmaFecha, coords.firmaFecha.x, coords.firmaFecha.y, { size: SIGNATURE_SZ, color: BRAND_BLUE });
  }

  // ── Imagen de firma (si existe)
  if (firmaDataUrl && coords.firmaImagen) {
    try {
      const b64   = firmaDataUrl.replace(/^data:image\/png;base64,/, '');
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const img   = await pdfDoc.embedPng(bytes);
      const fi    = coords.firmaImagen;
      const topLimit = coords.firmaNombre?.y ? coords.firmaNombre.y - 8 : fi.y + fi.h;
      const bottomLimit = coords.firmaFecha?.y ? coords.firmaFecha.y + 10 : fi.y;
      const safeX = fi.x + 4;
      const safeY = Math.max(fi.y + 2, bottomLimit);
      const safeW = Math.max(fi.w - 8, 24);
      const safeH = Math.max(Math.min(fi.y + fi.h - 6, topLimit) - safeY, 18);
      const scale = Math.min((safeW * 1.06) / img.width, (safeH * 1.08) / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const verticalOffset = -7;

      page.drawImage(img, {
        x: safeX + (safeW - drawW) / 2,
        y: safeY + (safeH - drawH) / 2 + verticalOffset,
        width: drawW, height: drawH,
      });
    } catch (e) {
      console.warn('Error al insertar firma:', e);
    }
  }

  return await pdfDoc.save();
}

export function downloadReciboPdfBytes(bytes, filename = 'recibo.pdf') {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
