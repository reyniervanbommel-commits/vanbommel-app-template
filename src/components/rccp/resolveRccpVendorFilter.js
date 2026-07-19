const VENDOR_FILTER_KEYS = ['vendorAccount', 'vendorName'];

/**
 * Leidt RCCP vendorAccount af uit PO-tabelfilters (exact equals only).
 * @param {Record<string, { operator?: string, value?: string }>} filterByColumn
 * @param {string} [vendorColumnKey='vendorAccount']
 * @returns {string|undefined}
 */
export function resolveRccpVendorFromFilter(filterByColumn, vendorColumnKey = 'vendorAccount') {
  if (!filterByColumn || typeof filterByColumn !== 'object') return undefined;

  const keys = [
    vendorColumnKey,
    ...VENDOR_FILTER_KEYS.filter((key) => key !== vendorColumnKey),
  ];

  for (const key of keys) {
    const filter = filterByColumn[key];
    if (filter?.operator !== 'equals') continue;
    const value = String(filter.value ?? '').trim();
    if (value) return value;
  }

  return undefined;
}
