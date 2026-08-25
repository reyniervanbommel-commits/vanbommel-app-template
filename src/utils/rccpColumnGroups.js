/** Vaste volgorde van kolomgroepen in RCCP-settingsdropdowns. */
export const RCCP_COLUMN_GROUP_ORDER = [
  'Purchase orders',
  'Vendors',
  'Items',
  'Receipt lines',
  'Excel upload',
];

/**
 * Groep voor een PO-bordkolom (eigen velden vs lookup-entiteit).
 * @param {{ source?: string, lookup?: { targetTableKey?: string } }} col
 * @returns {string}
 */
export function rccpColumnGroupLabel(col) {
  const target = String(col?.lookup?.targetTableKey || '').trim().toLowerCase();
  if (target === 'vendors') return 'Vendors';
  if (target === 'items') return 'Items';
  if (target === 'product-receipt-lines') return 'Receipt lines';
  if (col?.source === 'lookup' || target) return 'Excel upload';
  return 'Purchase orders';
}
