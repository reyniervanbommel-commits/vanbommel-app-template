/** Vaste default-kolomkeys voor RCCP-slots. Identiek aan server SLOT_DEFAULT_KEYS. */
export const SLOT_DEFAULT_KEYS = Object.freeze({
  vendor: 'vendorAccount',
  requested: 'requestedDeliveryDate',
  confirmed: 'confirmedDeliveryDate',
  receipt: 'productReceiptDate',
  open: 'remainingPurchaseQuantity',
  received: 'receivedPurchaseQuantity',
  ordered: 'quantity',
});

function isActiveColumn(col) {
  return col?.isActive !== false;
}

/**
 * Header-tekstkolom voor het Vendor-slot.
 * @param {{ key?: string, dataType?: string, scope?: string, isActive?: boolean }} col
 */
export function isRccpVendorColumn(col) {
  if (!col?.key || !isActiveColumn(col)) return false;
  return col.dataType === 'text' && col.scope === 'master';
}

/**
 * Datumkolom voor Requested / Confirmed / Receipt.
 * @param {{ key?: string, dataType?: string, isActive?: boolean }} col
 */
export function isRccpDateColumn(col) {
  if (!col?.key || !isActiveColumn(col)) return false;
  return col.dataType === 'date' || col.dataType === 'date_period';
}

/**
 * Getalkolom voor Open / Received / Ordered.
 * Custom zonder formule is in RCCP altijd leeg.
 * @param {{ key?: string, dataType?: string, source?: string, formulaExpr?: string, isActive?: boolean }} col
 */
export function isRccpQuantityColumn(col) {
  if (!col?.key || !isActiveColumn(col)) return false;
  if (col.dataType !== 'number') return false;
  const source = String(col.source || '').toLowerCase();
  if (source === 'custom' && !String(col.formulaExpr || '').trim()) return false;
  return true;
}
