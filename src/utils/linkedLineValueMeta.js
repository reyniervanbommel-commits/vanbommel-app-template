/**
 * Bouwt de lookup van header-kolom → bron-line-kolom voor Push-values-koppelingen.
 * @param {Array<{ headerColumnKey?: string, lineColumnKey?: string }>} lineValueHeaderLinks
 * @param {Array<object>} lineColumns
 * @param {{ isStaff?: boolean }} [options]
 * @returns {Record<string, object>}
 */
export function buildLinkedLineValueByHeaderKey(lineValueHeaderLinks, lineColumns, { isStaff = true } = {}) {
  const columns = Array.isArray(lineColumns) ? lineColumns : [];
  const links = Array.isArray(lineValueHeaderLinks) ? lineValueHeaderLinks : [];
  return links.reduce((acc, link) => {
    if (!link?.headerColumnKey || !link?.lineColumnKey) return acc;
    const lineColumn = columns.find((entry) => entry.key === link.lineColumnKey);
    acc[link.headerColumnKey] = {
      lineColumnKey: link.lineColumnKey,
      lineColumnId: lineColumn?.id ?? null,
      lineDataType: lineColumn?.dataType || 'text',
      lineColumnLabel: lineColumn?.label || '',
      writableToD365: Boolean(isStaff && lineColumn?.writableToD365 && lineColumn?.d365Field),
      lineColumnOptions: lineColumn?.options,
      lineColumn,
    };
    return acc;
  }, {});
}
