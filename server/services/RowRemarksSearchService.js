'use strict';

const sql = require('mssql');
const { getSqlPool } = require('../utils/sqlPool');
const { time } = require('../utils/timing');
const { ROLES } = require('../constants/roles');
const { getSupplierAccount } = require('../utils/supplierScope');
const {
  filterRowsForSupplier,
  getSupplierFilterColumnKey,
  loadSupplierVisibleRowKeys,
} = require('../utils/supplierRowAccess');
const { getTableByKey } = require('./TableRegistryService');
const {
  normalizePositiveId,
  normalizeSearchQuery,
  normalizeTableKey,
} = require('./RowRemarksValidation');

const defaultDependencies = {
  getPool: getSqlPool,
  getTable: getTableByKey,
};
let dependencies = { ...defaultDependencies };

function setTestDependencies(overrides = null) {
  dependencies = overrides ? { ...defaultDependencies, ...overrides } : { ...defaultDependencies };
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function normalizeActor(actor) {
  const id = normalizePositiveId(actor?.id, 'actor');
  if (actor?.role === ROLES.SUPPLIER) {
    return { id, role: ROLES.SUPPLIER, isAdmin: false, isSupplier: true };
  }
  if (![ROLES.ADMIN, ROLES.EMPLOYEE].includes(actor?.role)) {
    throw httpError(403, 'Insufficient permissions');
  }
  return { id, role: actor.role, isAdmin: actor.role === ROLES.ADMIN, isSupplier: false };
}

async function searchRemarks(tableKey, query, actor) {
  const normalizedActor = normalizeActor(actor);
  const table = await dependencies.getTable(normalizeTableKey(tableKey));
  const pool = await dependencies.getPool();
  const normalizedQuery = normalizeSearchQuery(query);
  const request = pool.request()
    .input('tableId', sql.BigInt, table.id)
    .input('q', sql.NVarChar(200), normalizedQuery);
  const result = await time('remarks_search_sql', () => request.query(`
    SELECT DISTINCT r.partition_key, r.record_key
    FROM dbo.tb_row_remarks r
    WHERE r.table_id = @tableId
      AND r.detail_key = -1
      AND r.is_deleted = 0
      AND CHARINDEX(@q, r.body COLLATE Latin1_General_CI_AS) > 0;
  `));
  let rows = result.recordset;
  if (normalizedActor.isSupplier) {
    const supplierFilterColumn = await getSupplierFilterColumnKey();
    const visibleKeys = await loadSupplierVisibleRowKeys(
      getSupplierAccount(actor),
      supplierFilterColumn,
      actor?.id ?? null,
    );
    rows = filterRowsForSupplier(rows, visibleKeys);
  }
  return {
    keys: rows.map((row) => ({
      partitionKey: row.partition_key,
      recordKey: row.record_key,
    })),
  };
}

module.exports = {
  searchRemarks,
  setTestDependencies,
};
