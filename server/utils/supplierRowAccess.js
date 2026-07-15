'use strict';

const sql = require('mssql');
const { ROLES } = require('../constants/roles');
const settingsService = require('../services/SettingsService');
const { getTableByKey, listColumns } = require('../services/TableRegistryService');
const { getSqlPool } = require('./sqlPool');
const { getSupplierAccount } = require('./supplierScope');

const SUPPLIER_FILTER_COLUMN_KEY = 'SUPPLIER_FILTER_COLUMN_KEY';
const DEFAULT_SUPPLIER_FILTER_COLUMN = 'vendorAccount';
const PURCHASE_ORDERS_TABLE = 'purchase-orders';

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function resolveSourceColumnValue(sourceJson, column) {
  const safeSource = sourceJson && typeof sourceJson === 'object' ? sourceJson : {};
  const sourceFieldKey = String(column?.sourceField || '').trim();
  if (sourceFieldKey && Object.prototype.hasOwnProperty.call(safeSource, sourceFieldKey)) {
    return safeSource[sourceFieldKey];
  }
  const columnKey = String(column?.key || '').trim();
  if (columnKey && Object.prototype.hasOwnProperty.call(safeSource, columnKey)) {
    return safeSource[columnKey];
  }
  return null;
}

function buildRowKey(partitionKey, recordKey) {
  return `${partitionKey}|${recordKey}`;
}

async function getSupplierFilterColumnKey() {
  return settingsService.getAsync(SUPPLIER_FILTER_COLUMN_KEY, DEFAULT_SUPPLIER_FILTER_COLUMN);
}

async function loadSupplierVisibleRowKeys(tableId, supplierAccount, supplierFilterColumn) {
  const masterCols = await listColumns({ tableId, scope: 'master', includeInactive: false });
  const filterCol = masterCols.find((col) => col.key === supplierFilterColumn);
  if (!filterCol) return new Set();

  const wanted = String(supplierAccount).trim().toLowerCase();
  const pool = await getSqlPool();
  const result = await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .query(`
      SELECT partition_key, record_key, data_json
      FROM dbo.tb_cache
      WHERE table_id = @tableId AND scope = 'master' AND detail_key = -1
    `);

  const keys = new Set();
  for (const row of result.recordset) {
    const json = parseJson(row.data_json);
    const value = String(resolveSourceColumnValue(json, filterCol) ?? '').trim().toLowerCase();
    if (value === wanted) keys.add(buildRowKey(row.partition_key, row.record_key));
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
  const table = await getTableByKey(PURCHASE_ORDERS_TABLE);
  const keys = await loadSupplierVisibleRowKeys(table.id, supplierAccount, supplierFilterColumn);
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
