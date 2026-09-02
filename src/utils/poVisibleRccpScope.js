function getRawVendorFromOrder(order, vendorColumnKey) {
  const key = vendorColumnKey || 'vendorAccount';
  const raw = order.vendorAccount
    ?? order.values?.[key]
    ?? order.values?.vendorAccount;
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
