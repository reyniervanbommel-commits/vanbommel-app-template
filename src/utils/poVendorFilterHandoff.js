// Draagt het actieve PO-tabelfilter (per browser-tab) over naar de RCCP-pagina, zodat
// RCCP bij openen dezelfde vendor toont als waarop de gebruiker net op de PO-pagina filterde.
// sessionStorage is hier bewust gekozen: het is een tijdelijke navigatie-hint, geen
// opgeslagen instelling (die horen in SQL, zie data-en-security.mdc).
const STORAGE_KEY = 'po:activeFilterByColumn';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeHandoffPayload(value) {
  if (!isPlainObject(value)) return null;
  if (value.v === 1) {
    if (value.derivedVendor != null && typeof value.derivedVendor !== 'string') return null;
    const filterByColumn = isPlainObject(value.filterByColumn) ? value.filterByColumn : {};
    const derivedVendor = String(value.derivedVendor || '').trim();
    if (derivedVendor.length > 64) return null;
    return { filterByColumn, derivedVendor };
  }
  if ('v' in value) return null;
  return { filterByColumn: value, derivedVendor: '' };
}

function readStoredHandoff() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeHandoffPayload(JSON.parse(raw));
  } catch (_) {
    return null;
  }
}

/**
 * Slaat het huidige PO-filter (filterByColumn) op zodat de RCCP-pagina het kan lezen.
 * @param {Record<string, { operator?: string, value?: string }>} filterByColumn
 */
export function savePoFilterByColumnForRccp(filterByColumn) {
  savePoRccpHandoff({ filterByColumn, derivedVendor: '' });
}

/**
 * Slaat de PO-handoff voor RCCP op: filter + afgeleide vendor uit de zichtbare rijen.
 * @param {{ filterByColumn?: Record<string, { operator?: string, value?: string }>, derivedVendor?: string }} handoff
 */
export function savePoRccpHandoff({ filterByColumn = {}, derivedVendor = '' } = {}) {
  if (typeof window === 'undefined') return;
  try {
    const safeFilter = isPlainObject(filterByColumn) ? filterByColumn : {};
    const safeDerivedVendor = typeof derivedVendor === 'string' ? derivedVendor.trim().slice(0, 64) : '';
    if (Object.keys(safeFilter).length > 0 || safeDerivedVendor) {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ v: 1, filterByColumn: safeFilter, derivedVendor: safeDerivedVendor }),
      );
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (_) {
    // Storage kan falen in private mode / bij quota — RCCP valt dan terug op de eerste vendor.
  }
}

/**
 * Leest het laatst bekende PO-filter voor de RCCP-pagina.
 * @returns {Record<string, { operator?: string, value?: string }> | null}
 */
export function readPoFilterByColumnForRccp() {
  return readStoredHandoff()?.filterByColumn || null;
}

/**
 * Leest de volledige PO-handoff voor RCCP.
 * @returns {{ filterByColumn: Record<string, { operator?: string, value?: string }>, derivedVendor: string } | null}
 */
export function readPoRccpHandoff() {
  return readStoredHandoff();
}
