function getRawVendorFromOrder(order, vendorColumnKey) {
  const key = vendorColumnKey || 'vendorAccount';
  const raw = order.vendorAccount
    || order.values?.[key]
    || order.values?.vendorAccount;
  if (raw == null) return '';
  return String(raw).trim();
}

function mapVendorValueToAccount(raw, vendors, vendorNames) {
  if (!raw) return null;
  if (vendors.includes(raw)) return raw;
  for (const [account, name] of Object.entries(vendorNames)) {
    if (name === raw) return account;
  }
  return raw;
}

export function collectOrderNumbers(orders) {
  const numbers = new Set();
  for (const order of orders || []) {
    const raw = order?.orderNumber;
    if (raw == null) continue;
    const trimmed = String(raw).trim();
    if (!trimmed) continue;
    numbers.add(trimmed);
  }
  return [...numbers].sort();
}

export function orderNumbersFingerprint(orderNumbers) {
  return (orderNumbers || []).join('\0');
}

/**
 * Only pass a PO subset when visible orders are not the full unfiltered set.
 * @param {string[]} visibleOrderNumbers
 * @param {object[]} allOrders
 * @returns {string[] | undefined}
 */
export function orderNumbersIfSubset(visibleOrderNumbers, allOrders) {
  const visible = visibleOrderNumbers || [];
  const all = collectOrderNumbers(allOrders);
  if (orderNumbersFingerprint(visible) === orderNumbersFingerprint(all)) {
    return undefined;
  }
  return visible;
}

export function resolveSharedVendorFromOrders(orders, { vendors = [], vendorNames = {}, vendorColumnKey } = {}) {
  const accounts = new Set();
  for (const order of orders || []) {
    const raw = getRawVendorFromOrder(order, vendorColumnKey);
    if (!raw) continue;
    const account = mapVendorValueToAccount(raw, vendors, vendorNames);
    if (account) accounts.add(account);
  }
  if (accounts.size === 1) return [...accounts][0];
  return '';
}
