const COORDS_STORAGE_KEYS = {
  cotizacion: 'instapro_coords_cotizacion',
  recibo: 'instapro_coords_recibo',
};

function getStorageKey(type = 'cotizacion') {
  return COORDS_STORAGE_KEYS[type] || COORDS_STORAGE_KEYS.cotizacion;
}

export function getStoredCoords(type = 'cotizacion') {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(type));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredCoords(type = 'cotizacion', coords) {
  if (typeof window === 'undefined' || !coords) return false;
  try {
    window.localStorage.setItem(getStorageKey(type), JSON.stringify(coords));
    return true;
  } catch {
    return false;
  }
}
