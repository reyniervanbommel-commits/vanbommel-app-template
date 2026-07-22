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

/**
 * Bepaalt de vendor waarmee de RCCP-pagina moet openen: als de PO-pagina een vendor-filter
 * (nr of naam, operator "equals") heeft staan én die vendor bestaat in de RCCP-vendorlijst,
 * gebruik die. Anders de eerste vendor uit de lijst (of '' als er geen vendors zijn).
 * @param {{ vendors: string[], vendorNames?: Record<string,string>, filterByColumn?: object, vendorColumnKey?: string }} params
 * @returns {string}
 */
export function resolveDefaultRccpVendor({
  vendors,
  vendorNames = {},
  filterByColumn,
  vendorColumnKey = 'vendorAccount',
}) {
  const list = Array.isArray(vendors) ? vendors : [];
  const candidate = resolveRccpVendorFromFilter(filterByColumn, vendorColumnKey);

  if (candidate) {
    if (list.includes(candidate)) return candidate;
    const candidateLower = candidate.toLowerCase();
    const matchByName = list.find(
      (vendor) => (vendorNames?.[vendor] || '').toLowerCase() === candidateLower,
    );
    if (matchByName) return matchByName;
  }

  return list[0] || '';
}
