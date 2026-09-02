'use strict';

const sql = require('mssql');
const d365OData = require('./D365ODataService');
const tableRegistry = require('./TableRegistryService');
const { compileSyncRules } = require('../utils/odataSyncFilter');
const { chunkList, combineODataFilters, buildOneOfFilterClause } = require('../utils/odataFilterCombine');
const {
  attributeNameFromRaw,
  attributeDisplayValue,
  buildPavRecordKey,
} = require('../utils/productAttributeValues');
const { time } = require('../utils/timing');

const PAV_SELECT_FIELDS = [
  'ProductNumber', 'AttributeName', 'Name', 'AttributeTypeName',
  'AttributeValue', 'TextValue', 'IntegerValue', 'DecimalValue',
  'BooleanValue', 'DateTimeValue', 'CurrencyValue',
];
const MAX_PRODUCT_NUMBER_CHUNKS = 50;
const CHUNK_SIZE = 20;
const CHUNK_CAP_NOTICE = 'Add an AttributeName sync filter; refresh stopped after 1000 item numbers to protect night refresh.';

function parseDefaultFilterRules(defaultFilter) {
  if (!defaultFilter) return [];
  try {
    const parsed = JSON.parse(defaultFilter);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toPavCacheRecord(raw) {
  const productNumber = String(raw?.ProductNumber || raw?.productNumber || '').trim();
  const attributeName = attributeNameFromRaw(raw);
  const displayValue = attributeDisplayValue(raw);
  const keys = buildPavRecordKey({ productNumber, attributeName, displayValue });
  return {
    partitionKey: keys.partitionKey,
    recordKey: keys.recordKey,
    modifiedAt: raw?.ModifiedDateTime || raw?.modifiedDateTime || null,
    masterRaw: raw,
    master: {},
    details: [],
  };
}

async function listItemRecordKeys() {
  const itemsTable = await tableRegistry.getTableByKey('items');
  if (!itemsTable?.id) return [];
  const pool = await tableRegistry.getPool();
  const result = await pool.request()
    .input('tableId', sql.BigInt, itemsTable.id)
    .query(`
      SELECT DISTINCT LTRIM(RTRIM(record_key)) AS record_key
      FROM dbo.tb_cache WITH (NOLOCK)
      WHERE table_id = @tableId
        AND ISNULL(removed_at_source, 0) = 0
        AND (detail_key IS NULL OR detail_key = -1)
    `);
  return (result.recordset || [])
    .map((row) => String(row.record_key || '').trim())
    .filter(Boolean);
}

async function productAttributeValuesFetch(table, { onProgress } = {}) {
  const itemKeys = await listItemRecordKeys();
  if (!itemKeys.length) {
    return { records: [], total: 0, truncated: false };
  }

  const adminFilter = compileSyncRules(parseDefaultFilterRules(table?.defaultFilter));
  const chunks = chunkList(itemKeys, CHUNK_SIZE);
  const limitedChunks = chunks.slice(0, MAX_PRODUCT_NUMBER_CHUNKS);
  const chunkCapped = chunks.length > MAX_PRODUCT_NUMBER_CHUNKS;
  const maxItems = Number.parseInt(String(table?.maxRows ?? ''), 10) || 10000;
  const records = [];
  let truncated = chunkCapped;
  let pagesFetched = 0;

  await time('pav_fetch', async () => {
    for (const chunk of limitedChunks) {
      const productFilter = buildOneOfFilterClause('ProductNumber', chunk);
      const extraFilter = combineODataFilters(adminFilter, productFilter);
      const result = await d365OData.fetchEntityRecords({
        sourceEntity: table.sourceEntity,
        fetchAll: true,
        extraFilter,
        maxItems,
        selectFields: PAV_SELECT_FIELDS,
        applyCompanyFilter: false,
      });
      truncated = truncated || Boolean(result.truncated);
      pagesFetched += Number(result.pagesFetched) || 0;
      for (const raw of Array.isArray(result.items) ? result.items : []) {
        const productNumber = String(raw?.ProductNumber || raw?.productNumber || '').trim();
        if (!productNumber) continue;
        records.push(toPavCacheRecord(raw));
      }
      if (typeof onProgress === 'function') {
        onProgress({
          fetched: records.length,
          pagesFetched,
          truncated,
        });
      }
    }
  });

  return {
    records,
    total: records.length,
    truncated,
    ...(chunkCapped ? { noticeText: CHUNK_CAP_NOTICE } : {}),
  };
}

module.exports = {
  productAttributeValuesFetch,
};
