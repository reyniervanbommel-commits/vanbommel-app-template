const ALL_ITEMS_LABEL = 'All items';
const ITEM_NUMBER_KEYS = new Set(['itemnumber', 'itemid', 'item_id']);

/**
 * Display text for the closed Item combobox.
 * @param {string[]} selectedItems
 * @returns {string}
 */
export function rccpItemPickerDisplayValue(selectedItems) {
  const items = (selectedItems || []).map((item) => String(item || '').trim()).filter(Boolean);
  if (!items.length) return ALL_ITEMS_LABEL;
  if (items.length === 1) return items[0];
  return `${items.length} items`;
}

function cellText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Lowercased search blob for one picker row (item number + extra columns).
 * @param {string} itemNumber
 * @param {Record<string, unknown>} extraValues
 * @param {{ key: string }[]} extraColumns
 */
export function rccpItemPickerSearchText(itemNumber, extraValues, extraColumns) {
  const parts = [String(itemNumber || '').trim()];
  for (const column of extraColumns || []) {
    parts.push(cellText(extraValues?.[column.key]));
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
}

/**
 * Filter unique item numbers by a query that searches every visible picker column.
 * @param {string[]} items
 * @param {Record<string, Record<string, unknown>>} extraValuesByItem
 * @param {{ key: string }[]} extraColumns
 * @param {string} query
 * @returns {string[]}
 */
export function filterRccpItemPickerItems(items, extraValuesByItem, extraColumns, query) {
  const term = String(query || '').trim().toLowerCase();
  if (!term) return items || [];
  return (items || []).filter((itemNumber) => (
    rccpItemPickerSearchText(itemNumber, extraValuesByItem?.[itemNumber], extraColumns).includes(term)
  ));
}

export function isRccpItemNumberColumnKey(key) {
  return ITEM_NUMBER_KEYS.has(String(key || '').trim().toLowerCase());
}

export { ALL_ITEMS_LABEL };
