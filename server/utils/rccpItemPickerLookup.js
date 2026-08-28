'use strict';

function cellText(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Project item-entity rows onto the requested item numbers and picker columns.
 * Duplicate item numbers keep the first row (typically the first company partition).
 * @param {{ recordKey?: string, values?: Record<string, unknown> }[]} rows
 * @param {string[]} itemNumbers
 * @param {string[]} columnKeys
 * @returns {Record<string, Record<string, string>>}
 */
function buildItemPickerLookupMap(rows, itemNumbers, columnKeys) {
  const wanted = new Set((itemNumbers || []).map((value) => String(value || '').trim()).filter(Boolean));
  const keys = (columnKeys || []).map((key) => String(key || '').trim()).filter(Boolean);
  if (!wanted.size || !keys.length) return {};

  const byItem = {};
  for (const row of rows || []) {
    const itemNumber = String(row?.recordKey || '').trim();
    if (!itemNumber || !wanted.has(itemNumber) || byItem[itemNumber]) continue;
    const values = row?.values || {};
    const projected = {};
    for (const key of keys) {
      projected[key] = cellText(values[key]);
    }
    byItem[itemNumber] = projected;
  }
  return byItem;
}

module.exports = { buildItemPickerLookupMap };
