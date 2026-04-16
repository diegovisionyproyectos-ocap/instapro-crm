import LZString from 'lz-string';

const PREFIX = 'instapro_cot_';

export function saveCotizacion(data) {
  const id = data.id || generateId();
  const cotizacion = { ...data, id };
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(cotizacion));
  } catch (e) {
    console.error('Error guardando cotización:', e);
  }
  return id;
}

export function updateCotizacion(id, patch) {
  if (!id) return null;
  const current = getCotizacion(id) || { id };
  const updated = { ...current, ...patch, id };
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error actualizando cotización:', e);
    return current;
  }
}

export function getCotizacion(id) {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function deleteCotizacion(id) {
  localStorage.removeItem(PREFIX + id);
}

export function getAllCotizaciones() {
  const result = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        result.push(data);
      } catch (e) {
        // skip invalid
      }
    }
  }
  return result.sort((a, b) => new Date(b.fechaEmision) - new Date(a.fechaEmision));
}

// Encode data in URL for cross-device sharing
export function encodeDataForUrl(data) {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeDataFromUrl(encoded) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    return null;
  }
}

function generateId() {
  return Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36);
}

// ─── Recibos de pago ──────────────────────────────────────────────────────────

const RECEIPT_PREFIX = 'instapro_rec_';

export function saveRecibo(data) {
  const id = data.id || generateId();
  const recibo = { ...data, id };
  try {
    localStorage.setItem(RECEIPT_PREFIX + id, JSON.stringify(recibo));
  } catch (e) {
    console.error('Error guardando recibo:', e);
  }
  return id;
}

export function updateRecibo(id, patch) {
  if (!id) return null;
  const current = getRecibo(id) || { id };
  const updated = { ...current, ...patch, id };
  try {
    localStorage.setItem(RECEIPT_PREFIX + id, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error actualizando recibo:', e);
    return current;
  }
}

export function getRecibo(id) {
  try {
    const raw = localStorage.getItem(RECEIPT_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
