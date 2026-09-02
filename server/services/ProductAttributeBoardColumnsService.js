'use strict';

const sql = require('mssql');
const { getPool, getTableByKey, listColumns, invalidateTableCache } = require('./TableRegistryService');
const { slugify, uniqueKeyForScope } = require('./TableColumnsService');

const PAV_TABLE_KEY = 'product-attribute-values';
const PO_TABLE_KEY = 'purchase-orders';

function normalizeBoardColumnBody(body) {
  if (typeof body?.visible !== 'boolean') {
    throw Object.assign(new Error('visible must be a boolean'), { status: 400 });
  }
  const attributeName = String(body?.attributeName || '').trim();
  if (!attributeName || attributeName.length > 128 || /[\x00-\x1F]/.test(attributeName)) {
    throw Object.assign(new Error('Invalid attributeName'), { status: 400 });
  }
  return { attributeName, visible: body.visible };
}

function isProductAttributeColumn(column) {
  return Boolean(column?.options && column.options.kind === 'product-attribute');
}

function columnKeyForAttribute(attributeName) {
  return `pav_${slugify(attributeName)}`;
}

async function listCacheAttributeNames(pavTableId) {
  if (!pavTableId) return [];
  const pool = await getPool();
  const result = await pool.request()
    .input('tableId', sql.BigInt, pavTableId)
    .query(`
      SELECT DISTINCT LTRIM(RTRIM(JSON_VALUE(data_json, '$.attributeName'))) AS attribute_name
      FROM dbo.tb_cache WITH (NOLOCK)
      WHERE table_id = @tableId
        AND ISNULL(removed_at_source, 0) = 0
        AND (detail_key IS NULL OR detail_key = -1)
        AND JSON_VALUE(data_json, '$.attributeName') IS NOT NULL
        AND LTRIM(RTRIM(JSON_VALUE(data_json, '$.attributeName'))) <> ''
    `);
  return (result.recordset || [])
    .map((row) => String(row.attribute_name || '').trim())
    .filter(Boolean);
}

async function listExistingPavColumns(poTableId) {
  const columns = await listColumns({ tableId: poTableId, scope: 'detail', includeInactive: true });
  return columns.filter(isProductAttributeColumn);
}

function unionAttributeNames(cacheNames, existingColumns) {
  const byName = new Map();
  for (const name of cacheNames) {
    const key = String(name || '').trim();
    if (!key) continue;
    byName.set(key, { name: key, visible: false, columnKey: columnKeyForAttribute(key) });
  }
  for (const column of existingColumns) {
    const name = String(column.options?.attributeName || '').trim();
    if (!name) continue;
    byName.set(name, {
      name,
      visible: Boolean(column.isActive),
      columnKey: column.key,
    });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function listBoardAttributeNames() {
  const [pavTable, poTable] = await Promise.all([
    getTableByKey(PAV_TABLE_KEY),
    getTableByKey(PO_TABLE_KEY),
  ]);
  const [cacheNames, existingColumns] = await Promise.all([
    listCacheAttributeNames(pavTable?.id),
    poTable?.id ? listExistingPavColumns(poTable.id) : Promise.resolve([]),
  ]);
  return unionAttributeNames(cacheNames, existingColumns);
}

async function setBoardAttributeVisible({ attributeName, visible }, userId) {
  const names = await listBoardAttributeNames();
  const existing = names.find((entry) => entry.name === attributeName);
  if (!existing) {
    throw Object.assign(new Error('Unknown attributeName'), { status: 400 });
  }
  const poTable = await getTableByKey(PO_TABLE_KEY);
  if (!poTable?.id) {
    throw Object.assign(new Error('Purchase orders table not found'), { status: 404 });
  }
  const pool = await getPool();
  const poColumns = await listExistingPavColumns(poTable.id);
  const current = poColumns.find((column) => column.options?.attributeName === attributeName);
  const optionsJson = JSON.stringify({ kind: 'product-attribute', attributeName });
  if (current) {
    await pool.request()
      .input('id', sql.BigInt, current.id)
      .input('visible', sql.Bit, visible ? 1 : 0)
      .input('userId', sql.Int, userId || null)
      .query(`
        UPDATE dbo.tb_columns
        SET is_active = @visible,
            is_default_visible = @visible,
            updated_by = @userId,
            updated_at = SYSUTCDATETIME()
        WHERE id = @id
      `);
    invalidateTableCache(PO_TABLE_KEY);
    return { name: attributeName, visible, columnKey: current.key };
  }
  const desiredKey = columnKeyForAttribute(attributeName);
  const columnKey = await uniqueKeyForScope(pool, poTable.id, 'detail', desiredKey);
  await pool.request()
    .input('tableId', sql.BigInt, poTable.id)
    .input('key', sql.NVarChar(64), columnKey)
    .input('label', sql.NVarChar(128), attributeName)
    .input('options', sql.NVarChar(sql.MAX), optionsJson)
    .input('visible', sql.Bit, visible ? 1 : 0)
    .input('userId', sql.Int, userId || null)
    .query(`
      INSERT INTO dbo.tb_columns
        (table_id, scope, [key], label, source, data_type, options_json, writable, is_default_visible, filterable, sortable, is_active, sort_order, created_by, updated_by)
      VALUES
        (@tableId, 'detail', @key, @label, 'lookup', 'text', @options, 0, @visible, 1, 1, @visible, 900, @userId, @userId)
    `);
  invalidateTableCache(PO_TABLE_KEY);
  return { name: attributeName, visible, columnKey };
}

module.exports = {
  normalizeBoardColumnBody,
  unionAttributeNames,
  listBoardAttributeNames,
  setBoardAttributeVisible,
};
