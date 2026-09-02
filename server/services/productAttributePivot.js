'use strict';

const sql = require('mssql');
const { getPool, getTableByKey } = require('./TableRegistryService');
const { firstValueAndExtra } = require('../utils/productAttributeValues');
const { time } = require('../utils/timing');

function isProductAttributeColumn(column) {
  return Boolean(column?.options && column.options.kind === 'product-attribute');
}

function jsonField(row, camel, pascal) {
  const camelValue = row?.[camel];
  if (camelValue !== undefined && camelValue !== null && camelValue !== '') return String(camelValue).trim();
  const pascalValue = row?.[pascal];
  if (pascalValue !== undefined && pascalValue !== null && pascalValue !== '') return String(pascalValue).trim();
  return '';
}

function buildPivotIndex(rows) {
  const index = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const productNumber = jsonField(row, 'productNumber', 'ProductNumber');
    const attributeName = jsonField(row, 'attributeName', 'AttributeName');
    const attributeValue = jsonField(row, 'attributeValue', 'AttributeValue');
    if (!productNumber || !attributeName || !attributeValue) continue;
    if (!index.has(productNumber)) index.set(productNumber, new Map());
    const byName = index.get(productNumber);
    if (!byName.has(attributeName)) byName.set(attributeName, []);
    byName.get(attributeName).push(attributeValue);
  }
  return index;
}

function applyProductAttributePivot(detailValues, itemNumber, pivot, pavColumnList) {
  if (!pivot || !Array.isArray(pavColumnList) || !pavColumnList.length) return null;
  const productNumber = String(itemNumber || '').trim();
  const byName = productNumber ? pivot.get(productNumber) : null;
  const extras = {};
  let hasExtras = false;
  for (const column of pavColumnList) {
    const attributeName = String(column?.options?.attributeName || '').trim();
    const key = column?.key;
    if (!key || !attributeName) continue;
    const values = byName?.get(attributeName) || [];
    const { first, additionalCount, allValuesLabel } = firstValueAndExtra(values);
    detailValues[key] = first || null;
    if (additionalCount > 0) {
      extras[key] = { additionalCount, allValuesLabel };
      hasExtras = true;
    }
  }
  return hasExtras ? extras : null;
}

async function loadProductAttributePivot(detailColumns) {
  const pavColumns = (Array.isArray(detailColumns) ? detailColumns : [])
    .filter((column) => isProductAttributeColumn(column) && column.isActive !== false);
  if (!pavColumns.length) return null;
  const names = [...new Set(pavColumns
    .map((column) => String(column.options?.attributeName || '').trim())
    .filter(Boolean))];
  if (!names.length) return null;

  return time('tb_lookup_pav_pivot', async () => {
    const pavTable = await getTableByKey('product-attribute-values');
    if (!pavTable?.id) return buildPivotIndex([]);
    const pool = await getPool();
    const request = pool.request().input('tableId', sql.BigInt, pavTable.id);
    const placeholders = names.map((name, index) => {
      const param = `name${index}`;
      request.input(param, sql.NVarChar(128), name);
      return `@${param}`;
    });
    const result = await request.query(`
      SELECT data_json
      FROM dbo.tb_cache WITH (NOLOCK)
      WHERE table_id = @tableId
        AND ISNULL(removed_at_source, 0) = 0
        AND (detail_key IS NULL OR detail_key = -1)
        AND JSON_VALUE(data_json, '$.attributeName') IN (${placeholders.join(', ')})
    `);
    const rows = (result.recordset || []).map((row) => {
      try {
        return JSON.parse(row.data_json || '{}');
      } catch {
        return {};
      }
    });
    return buildPivotIndex(rows);
  });
}

module.exports = {
  buildPivotIndex,
  applyProductAttributePivot,
  loadProductAttributePivot,
};
