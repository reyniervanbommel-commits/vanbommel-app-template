'use strict';

function isExcelTable(table) {
  return String(table?.source?.providerType || '').toLowerCase() === 'excel';
}

/**
 * D365-lookups eerst, Excel-doeltabellen altijd achteraan (zelfde volgorde binnen elke groep).
 */
async function orderLookupTargetKeys(targetKeys, loadTable) {
  const unique = [...new Set((targetKeys || [])
    .map((key) => String(key || '').trim())
    .filter(Boolean))];
  const entries = [];
  for (const key of unique) {
    try {
      const table = await loadTable(key);
      entries.push({ key, excel: isExcelTable(table) });
    } catch {
      entries.push({ key, excel: false });
    }
  }
  return [
    ...entries.filter((entry) => !entry.excel).map((entry) => entry.key),
    ...entries.filter((entry) => entry.excel).map((entry) => entry.key),
  ];
}

function formatEntityRefreshError(_tableKey, err) {
  const message = String(err?.message || 'Refresh failed').trim();
  if (/\bHTTP \d+\b|\bfailed \(\d+\)/.test(message)) return message;
  const status = err && err.status != null ? `HTTP ${err.status}` : null;
  return [status, message].filter(Boolean).join(': ');
}

module.exports = {
  isExcelTable,
  orderLookupTargetKeys,
  formatEntityRefreshError,
};
