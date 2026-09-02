export const PO_TABLE_ZOOM_DEFAULT = 0.85;
export const PO_TABLE_ZOOM_MIN = 0.75;
export const PO_TABLE_ZOOM_MAX = 1.1;
export const PO_TABLE_ZOOM_STEP = 0.05;
export const PO_TABLE_ZOOM_CSS_VAR = '--po-table-zoom';
export const PO_TABLE_ZOOM_STORAGE_KEY = 'po:tableZoom:purchase-orders';

const subscribers = new Set();

/**
 * @param {number} value
 * @returns {number}
 */
export function clampPoTableZoom(value) {
  return Math.min(PO_TABLE_ZOOM_MAX, Math.max(PO_TABLE_ZOOM_MIN, value));
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function parsePoTableZoom(raw) {
  const parsed = Number(raw);
  const base = Number.isFinite(parsed) ? parsed : PO_TABLE_ZOOM_DEFAULT;
  return clampPoTableZoom(base);
}

/**
 * @param {number} current
 * @param {-1|1} direction
 * @returns {number}
 */
export function stepPoTableZoom(current, direction) {
  const next = clampPoTableZoom(current + direction * PO_TABLE_ZOOM_STEP);
  return Math.round(next * 100) / 100;
}

/**
 * @param {number} value
 * @returns {string}
 */
export function formatPoTableZoomPercent(value) {
  return `${Math.round(value * 100)}%`;
}

/**
 * @param {number} px
 * @returns {string}
 */
export function poTableZoomedPx(px) {
  return `calc(${px}px * var(--po-table-zoom, ${PO_TABLE_ZOOM_DEFAULT}))`;
}

/**
 * @param {number} visualPx
 * @param {number} scale
 * @returns {number}
 */
export function visualPxToStored(visualPx, scale) {
  return Math.round(visualPx / scale);
}

/**
 * @returns {number}
 */
export function readPoTableZoom() {
  if (typeof window === 'undefined') return PO_TABLE_ZOOM_DEFAULT;
  try {
    const raw = window.localStorage.getItem(PO_TABLE_ZOOM_STORAGE_KEY);
    if (raw == null) return PO_TABLE_ZOOM_DEFAULT;
    return parsePoTableZoom(raw);
  } catch (_) {
    return PO_TABLE_ZOOM_DEFAULT;
  }
}

/**
 * @param {unknown} value
 */
export function writePoTableZoom(value) {
  if (typeof window === 'undefined') return;
  const clamped = parsePoTableZoom(value);
  try {
    window.localStorage.setItem(PO_TABLE_ZOOM_STORAGE_KEY, String(clamped));
  } catch (_) {
    // Private mode / quota: persist fails silently.
  }
}

let current = readPoTableZoom();

/**
 * @returns {number}
 */
export function getPoTableZoom() {
  return current;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function setPoTableZoom(value) {
  const clamped = parsePoTableZoom(value);
  current = clamped;
  writePoTableZoom(clamped);
  subscribers.forEach((listener) => listener(clamped));
  return clamped;
}

/**
 * @param {(value: number) => void} listener
 * @returns {() => void}
 */
export function subscribePoTableZoom(listener) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/**
 * @param {HTMLElement|null|undefined} el
 * @param {unknown} [value]
 */
export function applyPoTableZoom(el, value = current) {
  if (!el) return;
  el.style.setProperty(PO_TABLE_ZOOM_CSS_VAR, String(parsePoTableZoom(value)));
}

export function resetPoTableZoomStoreForTests() {
  current = PO_TABLE_ZOOM_DEFAULT;
}
