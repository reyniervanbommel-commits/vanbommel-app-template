'use strict';

const { ROLES } = require('../constants/roles');
const settingsService = require('../services/SettingsService');
const { getSupplierAccount } = require('./supplierScope');

const SUPPLIER_FILTER_COLUMN_KEY = 'SUPPLIER_FILTER_COLUMN_KEY';
const DEFAULT_SUPPLIER_FILTER_COLUMN = 'vendorAccount';
const PURCHASE_ORDERS_TABLE = 'purchase-orders';

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function buildRowKey(partitionKey, recordKey) {
  return `${partitionKey}|${recordKey}`;
}

async function getSupplierFilterColumnKey() {
  return settingsService.getAsync(SUPPLIER_FILTER_COLUMN_KEY, DEFAULT_SUPPLIER_FILTER_COLUMN);
}

// Bepaalt welke orders een supplier mag zien via dezelfde board-read (TableDataService.read)
// als het PO-board — inclusief lookup-/formula-verrijking. Zo is de zichtbare keyset altijd
// consistent met wat de vendor op het board ziet.

// 60-seconden TTL-cache voor de zichtbare row-keyset per vendor.
// Voorkomt dat elke remark-actie een volledige board-read triggert.
const _visibleKeyCache = new Map();
const _CACHE_TTL_MS = 60_000;

async function loadSupplierVisibleRowKeys(supplierAccount, supplierFilterColumn, userId = null) {
  const cacheKey = supplierAccount + ':' + supplierFilterColumn;
  const cached = _visibleKeyCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < _CACHE_TTL_MS) return cached.keys;

  // Lazy require voorkomt een module-cycle bij het laden.
  const dataService = require('../services/TableDataService');
  const data = await dataService.read({
    tableKey: PURCHASE_ORDERS_TABLE,
    userId,
    supplierAccount,
    supplierFilterColumn,
    includeDetails: false,
  });
  const keys = new Set();
  for (const row of Array.isArray(data?.rows) ? data.rows : []) {
    keys.add(buildRowKey(row.partitionKey, row.recordKey));
  }
  _visibleKeyCache.set(cacheKey, { keys, ts: Date.now() });
  return keys;
}

// Per-rij scope-check via dezelfde board-read als loadSupplierVisibleRowKeys. De oude aanpak
// (checkRowInSupplierScope) las de ruwe data_json zonder lookup-verrijking en week daarmee af
// van de waarden waarop het board filtert — wat de "Access denied" bug op geldige orders veroorzaakte.
async function assertSupplierPurchaseOrderRow(user, { tableKey, partitionKey, recordKey }) {
  if (!user || user.role !== ROLES.SUPPLIER) return;
  if (String(tableKey || '').trim() !== PURCHASE_ORDERS_TABLE) {
    throw httpError(403, 'Access denied — insufficient permissions');
  }

  const partition = String(partitionKey ?? '').trim();
  const record = String(recordKey ?? '').trim();
  if (!partition || !record) throw httpError(400, 'partitionKey and recordKey are required');

  const supplierAccount = getSupplierAccount(user);
  const supplierFilterColumn = await getSupplierFilterColumnKey();
  const keys = await loadSupplierVisibleRowKeys(supplierAccount, supplierFilterColumn, user.id);
  if (!keys.has(buildRowKey(partition, record))) {
    throw httpError(403, 'Access denied — order not in your vendor scope');
  }
}

function filterRowsForSupplier(rows, visibleKeys) {
  return rows.filter((row) => (
    visibleKeys.has(buildRowKey(row.partitionKey || row.partition_key, row.recordKey || row.record_key))
  ));
}

module.exports = {
  PURCHASE_ORDERS_TABLE,
  assertSupplierPurchaseOrderRow,
  filterRowsForSupplier,
  getSupplierFilterColumnKey,
  loadSupplierVisibleRowKeys,
};
