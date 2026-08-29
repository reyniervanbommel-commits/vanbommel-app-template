// Unsaved PO-tabel filter/sort/grouping voor de huidige browser-tab.
// Bewust sessionStorage: niet de saved view (SQL), wel terug bij navigatie binnen de tab.
// Zie data-en-security.mdc: geen localStorage voor dit soort state.

const STORAGE_PREFIX = 'po:tableSession:purchase-orders:';
const ALL_ORDERS_KEY = 'all-orders';
const LAST_KEY = `${STORAGE_PREFIX}__last`;

/**
 * @param {string|number|null|undefined} viewId
 * @returns {string}
 */
export function poTableSessionStorageKey(viewId) {
  const suffix = viewId == null || viewId === '' ? ALL_ORDERS_KEY : String(viewId);
  return `${STORAGE_PREFIX}${suffix}`;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {string|number|null|undefined} viewId
 * @param {object} snapshot
 */
export function savePoTableSession(viewId, snapshot) {
  if (typeof window === 'undefined' || !isPlainObject(snapshot)) return;
  try {
    window.sessionStorage.setItem(poTableSessionStorageKey(viewId), JSON.stringify(snapshot));
    window.sessionStorage.setItem(LAST_KEY, JSON.stringify(snapshot));
  } catch (_) {
    // Private mode / quota: sessie-restore valt dan stil tot de tab sluit.
  }
}

/**
 * @param {string|number|null|undefined} viewId
 * @returns {object|null}
 */
export function readPoTableSession(viewId) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(poTableSessionStorageKey(viewId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

/** Laatste snapshot van deze tab, ongeacht view — voor hydrate vóór de eerste paint. */
export function readLastPoTableSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

/**
 * @param {string|number|null|undefined} viewId
 * @param {(snapshot: object) => void} applySnapshot
 * @returns {boolean}
 */
export function applyPoTableSessionOverlay(viewId, applySnapshot) {
  const snapshot = readPoTableSession(viewId);
  if (!snapshot) return false;
  applySnapshot(snapshot);
  return true;
}

/**
 * @param {string|number|null|undefined} viewId
 */
export function clearPoTableSession(viewId) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(poTableSessionStorageKey(viewId));
  } catch (_) {
    // Storage kan geblokkeerd zijn.
  }
}

export function clearAllPoTableSessions() {
  if (typeof window === 'undefined') return;
  try {
    const keys = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch (_) {
    // Storage kan geblokkeerd zijn.
  }
}
