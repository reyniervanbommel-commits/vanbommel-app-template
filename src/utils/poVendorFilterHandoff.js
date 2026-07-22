// Draagt het actieve PO-tabelfilter (per browser-tab) over naar de RCCP-pagina, zodat
// RCCP bij openen dezelfde vendor toont als waarop de gebruiker net op de PO-pagina filterde.
// sessionStorage is hier bewust gekozen: het is een tijdelijke navigatie-hint, geen
// opgeslagen instelling (die horen in SQL, zie data-en-security.mdc).
const STORAGE_KEY = 'po:activeFilterByColumn';

/**
 * Slaat het huidige PO-filter (filterByColumn) op zodat de RCCP-pagina het kan lezen.
 * @param {Record<string, { operator?: string, value?: string }>} filterByColumn
 */
export function savePoFilterByColumnForRccp(filterByColumn) {
  if (typeof window === 'undefined') return;
  try {
    if (filterByColumn && Object.keys(filterByColumn).length > 0) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filterByColumn));
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
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}
