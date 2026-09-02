// D365 PurchStatus enum-members vs. the labels shown on D365 forms.
// OData stores Backorder; the form label is Open order. Display-only — never write this back.

const PURCH_STATUS_DISPLAY_BY_VALUE = Object.freeze({
  backorder: 'Open order',
});

const PURCH_STATUS_STORED_BY_DISPLAY = Object.freeze({
  'open order': 'Backorder',
});

export function isPurchaseOrderStatusColumn(column = {}) {
  const field = String(column?.d365Field || '').trim().toLowerCase();
  if (field === 'purchaseorderstatus') return true;
  const key = String(column?.columnKey || column?.key || '').trim().toLowerCase();
  return key === 'status' || key === 'purchaseorderstatus' || key === 'purchase_order_status';
}

export function formatPurchStatusDisplay(value) {
  const text = String(value ?? '').trim();
  if (!text) return text;
  return PURCH_STATUS_DISPLAY_BY_VALUE[text.toLowerCase()] || text;
}

export function toPurchStatusStoredValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return text;
  return PURCH_STATUS_STORED_BY_DISPLAY[text.toLowerCase()] || text;
}

export function formatColumnUniqueValue(column, value) {
  if (!isPurchaseOrderStatusColumn(column)) return String(value ?? '');
  return formatPurchStatusDisplay(value) || String(value ?? '');
}
