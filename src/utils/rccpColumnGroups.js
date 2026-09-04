/** Vaste volgorde van kolomgroepen in RCCP-settingsdropdowns. */
export const RCCP_COLUMN_GROUP_ORDER = [
  'PO headers',
  'PO lines',
  'Vendors',
  'Items',
  'Receipt lines',
  'Excel upload',
  'Purchase orders',
];

const PO_SCOPE_GROUP = { master: 'PO headers', detail: 'PO lines' };
const PO_SCOPE_SHORT = { master: 'PO header', detail: 'PO line' };

/**
 * Optionele master:/detail:-prefix op een kolomkey.
 * @param {string} stored
 * @returns {{ scope: 'master' | 'detail' | null, key: string }}
 */
export function parseRccpColumnRef(stored) {
  const value = String(stored || '').trim();
  if (!value) return { scope: null, key: '' };
  const prefixed = /^(master|detail):([A-Za-z0-9_]+)$/.exec(value);
  if (prefixed) return { scope: prefixed[1], key: prefixed[2] };
  if (/^[A-Za-z0-9_]+$/.test(value)) return { scope: null, key: value };
  return { scope: null, key: '' };
}

function isLookupColumn(col) {
  const target = String(col?.lookup?.targetTableKey || '').trim();
  return Boolean(target) || col?.source === 'lookup';
}

function poScope(col) {
  return col?.scope === 'detail' ? 'detail' : 'master';
}

/**
 * Groep voor een PO-bordkolom (eigen velden vs lookup-entiteit).
 * @param {{ source?: string, scope?: string, lookup?: { targetTableKey?: string } }} col
 * @returns {string}
 */
export function rccpColumnGroupLabel(col) {
  const target = String(col?.lookup?.targetTableKey || '').trim().toLowerCase();
  if (target === 'vendors') return 'Vendors';
  if (target === 'items') return 'Items';
  if (target === 'product-receipt-lines') return 'Receipt lines';
  if (col?.source === 'lookup' || target) return 'Excel upload';
  return PO_SCOPE_GROUP[poScope(col)];
}

/** Unieke dropdown-value: scope + kolomkey. */
export function rccpColumnOptionValue(col) {
  return `${poScope(col)}:${col.key}`;
}

/**
 * Vindt de kolom die bij een opgeslagen RCCP-key hoort.
 * Zonder prefix: regel eerst, daarna header.
 * @param {Array<{ key?: string, scope?: string }>} columns
 * @param {string} storedKey
 */
export function matchRccpColumn(columns, storedKey) {
  const { scope, key } = parseRccpColumnRef(storedKey);
  if (!key) return null;
  const matches = (columns || []).filter((col) => col?.key === key);
  if (scope) return matches.find((col) => col.scope === scope) || null;
  return matches.find((col) => col.scope === 'detail') || matches[0] || null;
}

/**
 * Dropdown-optie met unieke value en header/line-label.
 * @param {{ key: string, label?: string, scope?: string, source?: string, lookup?: object }} col
 */
export function buildRccpColumnOption(col) {
  const label = col.label || col.key;
  const text = label === col.key ? label : `${label} (${col.key})`;
  const native = !isLookupColumn(col);
  const shortScope = native ? PO_SCOPE_SHORT[poScope(col)] : '';
  return {
    value: rccpColumnOptionValue(col),
    text: shortScope ? `${text} · ${shortScope}` : text,
    shortText: shortScope ? `${label} · ${shortScope}` : label,
    group: rccpColumnGroupLabel(col),
  };
}
