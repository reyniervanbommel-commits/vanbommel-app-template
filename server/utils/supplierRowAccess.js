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

// Bepaalt welke orders een supplier mag zien. Hergebruikt bewust de board-read
// (TableDataService.read) zodat exact dezelfde scoping geldt als op het PO-board — inclusief de
// lookup-/formula-verrijking van de filterkolom. Zo kan een order nooit wél op het board staan
// en toch door de remark-scopecheck worden geweigerd (de oude check las alleen de ruwe data_json,
// wat afweek van de verrijkte waarde waarop het board filtert).
async function loadSupplierVisibleRowKeys(supplierAccount, supplierFilterColumn, userId = null) {
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
  return keys;
}

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
