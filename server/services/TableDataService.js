'use strict';

// Generieke, tableKey-gedreven datalaag voor de Table Builder (#AB:152, Fase A). Bron-neutraal:
// lezen gaat uit tb_cache (cache-is-leidend); de bron wordt alleen geraadpleegd bij refresh. De projectie
// is config-gedreven: per tabel bepalen de actieve bron-kolommen (tb_columns, source='source') wélke
// velden in data_json landen.
//
// Fase A gebruikt een interne fetch-adapter per tabel; in Fase B (#139) wordt dit vervangen door de
// SourceProvider-interface (D365ODataProvider.fetch/discoverFields). Write-back (correctField) blijft in
// Fase A nog op het bestaande po_*-pad en wordt in Fase C generiek via de provider.

const crypto = require('crypto');
const sql = require('mssql');
const { logger } = require('../utils/logger');
const settingsService = require('./SettingsService');
const { fetchPurchaseOrders, writeBackField } = require('./D365ODataService');
const { getPool, getTableByKey, listColumns, getLookups } = require('./TableRegistryService');
const { compileSyncRules, parseSyncRules, OPERATORS, MAX_RULES } = require('../utils/odataSyncFilter');
const { time } = require('../utils/timing');

const MASTER_DETAIL_KEY = -1; // sentinel: master-rij / master-niveau custom-waarde
const MAX_KEY_LENGTH = 64;
const FIELD_DISCOVERY_SAMPLE_LIMIT = 800;
const DATA_MODEL_PREVIEW_ROW_LIMIT = 60;
// Aantal masterrecords per save-batch. De save schrijft per chunk set-based weg (bulk copy naar een
// staging-temptabel + één MERGE), i.p.v. een transactie + losse INSERTs per order/regel. Dat brengt het
// aantal SQL-round-trips van O(orders × regels) terug naar O(chunks), de grootste refresh-versneller.
const SAVE_CHUNK_SIZE = 500;
const EMPTY_REFRESH_PROGRESS = Object.freeze({
  status: 'idle',
  fetched: 0,
  totalToFetch: null,
  saved: 0,
  totalToSave: null,
  sourceTotal: null,
  pagesFetched: 0,
  truncated: false,
  startedAt: null,
  finishedAt: null,
  error: null,
  updatedAt: null,
});
const refreshProgressByTable = new Map();
const refreshJobsByTable = new Map();

function createRefreshProgressBase() {
  return { ...EMPTY_REFRESH_PROGRESS };
}

function resetRefreshProgress(tableKey, patch = {}) {
  const key = String(tableKey || '').trim();
  if (!key) return;
  refreshProgressByTable.set(key, {
    ...createRefreshProgressBase(),
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

function updateRefreshProgress(tableKey, patch = {}) {
  const key = String(tableKey || '').trim();
  if (!key) return;
  const current = refreshProgressByTable.get(key) || createRefreshProgressBase();
  refreshProgressByTable.set(key, {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

function getRefreshProgress(tableKey) {
  const key = String(tableKey || '').trim();
  if (!key) return createRefreshProgressBase();
  return { ...(refreshProgressByTable.get(key) || createRefreshProgressBase()) };
}

function isRefreshRunning(tableKey) {
  const key = String(tableKey || '').trim();
  if (!key) return false;
  return refreshJobsByTable.has(key);
}

async function startRefresh(tableKey) {
  const key = String(tableKey || '').trim();
  if (!key) throw Object.assign(new Error('Ongeldige tabelkey'), { status: 400 });
  if (refreshJobsByTable.has(key)) {
    return {
      started: false,
      running: true,
      progress: getRefreshProgress(key),
    };
  }
  resetRefreshProgress(key, {
    status: 'fetching',
    fetched: 0,
    totalToFetch: null,
    saved: 0,
    totalToSave: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  });
  const job = (async () => {
    try {
      await refresh(key);
    } catch (err) {
      logger.error('Achtergrond-refresh mislukt', { tableKey: key, error: err.message });
    } finally {
      refreshJobsByTable.delete(key);
    }
  })();
  refreshJobsByTable.set(key, job);
  return {
    started: true,
    running: true,
    progress: getRefreshProgress(key),
  };
}

// ---------------------------------------------------------------------------
// Fetch-adapters: vertalen een bron naar generieke records {partitionKey, recordKey, master, details}.
// TODO (Fase B / #139): vervang door SourceProvider.fetch(), geresolved uit tb_sources.provider_type.
// ---------------------------------------------------------------------------
async function purchaseOrdersFetch(table, { onProgress } = {}) {
  const company = (await settingsService.getAsync('D365_ODATA_COMPANY', '')).trim();
  const rawMax = await settingsService.getAsync('PO_SYNC_MAX_ORDERS', String(table.maxRows || 2000));
  const parsedMax = Number.parseInt(rawMax, 10);
  const maxItems = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : (table.maxRows || 2000);
  let extraFilter = '';
  try {
    extraFilter = compileSyncRules(parseSyncRules(await settingsService.getAsync('PO_SYNC_RULES', '')));
  } catch (err) {
    logger.warn('PO_SYNC_RULES ongeldig; generieke table-sync draait zonder filterregels', { error: err.message });
  }

  // Kolom-projectie aan de bron ($select): haal alleen de geconfigureerde bron-velden op i.p.v. de volledige
  // D365-entiteit. Kan uitgezet worden via D365_ODATA_SELECT_ENABLED=false (bv. om alle velden opnieuw te
  // laten ontdekken). Actieve bron-kolommen bepalen de lijst; verplichte velden gaan altijd mee.
  const selectEnabled = String(await settingsService.getAsync('D365_ODATA_SELECT_ENABLED', 'true'))
    .trim().toLowerCase() !== 'false';
  let selectFields = null;
  let lineSelectFields = null;
  if (selectEnabled) {
    const [masterCols, detailCols] = await Promise.all([
      listColumns({ tableId: table.id, scope: 'master', includeInactive: false }),
      listColumns({ tableId: table.id, scope: 'detail', includeInactive: false }),
    ]);
    selectFields = buildD365SelectFields(REQUIRED_HEADER_D365_FIELDS, masterCols);
    lineSelectFields = buildD365SelectFields(REQUIRED_LINE_D365_FIELDS, detailCols);
  }

  const result = await fetchPurchaseOrders({
    supplierAccount: null,
    fetchAll: true,
    extraFilter,
    maxItems,
    onProgress,
    selectFields,
    lineSelectFields,
  });
  const items = Array.isArray(result.items) ? result.items : [];

  const records = items.map((order) => {
    const raw = order.raw || {};
    return {
      partitionKey: String(raw.dataAreaId || company || '').trim(),
      recordKey: String(order.orderNumber || raw.PurchaseOrderNumber || '').trim(),
      modifiedAt: raw.ModifiedDateTime || null,
      masterRaw: raw,
      master: {
        orderNumber: order.orderNumber,
        vendorAccount: order.vendorAccount,
        vendorName: order.vendorName,
        status: order.status,
        currencyCode: order.currencyCode,
        requestedDeliveryDate: order.requestedDeliveryDate,
        createdDateTime: order.createdDateTime,
      },
      details: (Array.isArray(order.lines) ? order.lines : []).map((line) => ({
        detailKey: toNumberOrNull(line.lineNumber),
        raw: line.raw || {},
        values: {
          lineNumber: line.lineNumber,
          itemNumber: line.itemNumber,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          lineAmount: line.lineAmount,
          currencyCode: line.currencyCode,
          requestedDeliveryDate: line.requestedDeliveryDate,
        },
      })),
    };
  });
  return { records, total: result.total, truncated: Boolean(result.truncated) };
}

// Verplichte D365-velden die altijd mee moeten in $select, los van wat de admin selecteert: de velden die
// de interne mappers (mapPurchaseOrder/mapPurchaseOrderLine), de partitiesleutel (dataAreaId) en het
// watermerk (ModifiedDateTime) nodig hebben. Zonder deze zou het beperken van de kolommen de sync breken.
const REQUIRED_HEADER_D365_FIELDS = [
  'dataAreaId', 'ModifiedDateTime',
  'PurchaseOrderNumber', 'PurchId', 'PurchaseOrderId', 'RecId',
  'OrderVendorAccountNumber', 'InvoiceVendorAccountNumber', 'VendorAccountNumber',
  'PurchaseOrderName', 'VendorName', 'PurchaseOrderStatus', 'DocumentStatus',
  'CurrencyCode', 'RequestedDeliveryDate', 'RequestedDeliveryDateTime',
  'CreatedDateTime', 'AccountingDate',
];
const REQUIRED_LINE_D365_FIELDS = [
  'PurchaseOrderNumber', 'LineNumber', 'ItemNumber', 'LineDescription',
  'OrderedPurchaseQuantity', 'PurchaseUnitSymbol', 'LineAmount', 'CurrencyCode',
  'RequestedDeliveryDate', 'RequestedReceiptDate',
];

// Bouwt de $select-lijst uit de verplichte velden + de source_field van de actieve bron-kolommen.
// Retourneert null wanneer er (nog) geen geconfigureerde bron-kolom is: dan geen $select, zodat een verse
// tabel via de volledige respons kan bootstrappen (veld-discovery) en niets stilzwijgend wegvalt.
function buildD365SelectFields(requiredFields, columns) {
  const fields = new Set(requiredFields);
  let hasConfigured = false;
  for (const col of columns) {
    if (col.source === 'source' && col.sourceField && !String(col.sourceField).startsWith('@')) {
      fields.add(col.sourceField);
      hasConfigured = true;
    }
  }
  return hasConfigured ? [...fields] : null;
}

const FETCH_ADAPTERS = {
  'purchase-orders': purchaseOrdersFetch,
};

function getFetchAdapter(table) {
  const adapter = FETCH_ADAPTERS[table.key];
  if (!adapter) {
    throw Object.assign(new Error(`Geen fetch-adapter voor tabel '${table.key}' (komt in Fase B via SourceProvider)`), { status: 501 });
  }
  return adapter;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function normalizeOut(value) {
  if (value instanceof Date) return value.toISOString();
  return value === undefined ? null : value;
}
function projectJson(source, sourceColumns) {
  const json = {};
  for (const col of sourceColumns) {
    const directValue = source ? source[col.key] : null;
    const fallbackValue = directValue === undefined && col.sourceField ? source?.[col.sourceField] : undefined;
    json[col.key] = normalizeOut(fallbackValue === undefined ? directValue : fallbackValue);
  }
  return JSON.stringify(json);
}
function parseJson(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toColumnLabelFromField(field) {
  return String(field || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .slice(0, 128);
}

function slugifyColumnKey(label) {
  const base = String(label || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_KEY_LENGTH);
  return base || 'kolom';
}

function inferSourceDataType(value) {
  if (value instanceof Date) return 'date';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'text';
}

function shouldDiscoverSourceField(field, value) {
  const normalizedField = String(field || '').trim();
  if (!normalizedField || normalizedField.startsWith('@')) return false;
  if (Array.isArray(value) || isPlainObject(value)) return false;
  return true;
}

function nextUniqueKey(baseKey, existingKeys) {
  let candidate = String(baseKey || '').slice(0, MAX_KEY_LENGTH) || 'kolom';
  if (!existingKeys.has(candidate.toLowerCase())) return candidate;
  for (let i = 2; i < 1000; i += 1) {
    const withSuffix = `${baseKey}_${i}`.slice(0, MAX_KEY_LENGTH);
    if (!existingKeys.has(withSuffix.toLowerCase())) return withSuffix;
  }
  throw new Error(`Kon geen unieke key bepalen voor '${baseKey}'`);
}

function collectDiscoveredFields(records, level) {
  const discovered = new Map();
  const list = Array.isArray(records) ? records.slice(0, FIELD_DISCOVERY_SAMPLE_LIMIT) : [];
  for (const record of list) {
    const rawObjects = level === 'line'
      ? (Array.isArray(record.details) ? record.details.map((detail) => detail?.raw).filter(isPlainObject) : [])
      : (isPlainObject(record.masterRaw) ? [record.masterRaw] : []);
    for (const raw of rawObjects) {
      Object.entries(raw).forEach(([field, value]) => {
        if (!shouldDiscoverSourceField(field, value)) return;
        const normalizedField = String(field).trim();
        if (!discovered.has(normalizedField)) {
          discovered.set(normalizedField, {
            field: normalizedField,
            label: toColumnLabelFromField(normalizedField) || normalizedField,
            dataType: 'text',
          });
        }
        const current = discovered.get(normalizedField);
        const inferredType = inferSourceDataType(value);
        if (current.dataType === 'text' && inferredType !== 'text') current.dataType = inferredType;
      });
    }
  }
  return [...discovered.values()].sort((a, b) => a.field.localeCompare(b.field));
}

async function syncSourceColumnsFromRecords(table, records) {
  if (!Array.isArray(records) || !records.length) return { headerInserted: 0, lineInserted: 0 };
  const pool = await getPool();

  async function insertMissingForScope(scope, discoveredFields) {
    if (!discoveredFields.length) return 0;
    const existingColumns = await listColumns({ tableId: table.id, scope, includeInactive: true });
    const existingSourceFields = new Set(
      existingColumns
        .filter((col) => col.source === 'source' && col.sourceField)
        .map((col) => String(col.sourceField).toLowerCase())
    );
    const existingKeys = new Set(existingColumns.map((col) => String(col.key || '').toLowerCase()));
    let nextSortOrder = existingColumns.reduce((maxSort, col) => Math.max(maxSort, Number(col.sortOrder) || 0), 0);
    let inserted = 0;

    for (const fieldMeta of discoveredFields) {
      if (existingSourceFields.has(fieldMeta.field.toLowerCase())) continue;
      const baseKey = slugifyColumnKey(fieldMeta.field);
      const key = nextUniqueKey(baseKey, existingKeys);
      existingKeys.add(key.toLowerCase());
      existingSourceFields.add(fieldMeta.field.toLowerCase());
      nextSortOrder += 10;

      await pool.request()
        .input('tableId', sql.BigInt, table.id)
        .input('scope', sql.NVarChar(16), scope)
        .input('key', sql.NVarChar(64), key)
        .input('label', sql.NVarChar(128), fieldMeta.label)
        .input('sourceField', sql.NVarChar(128), fieldMeta.field)
        .input('dataType', sql.NVarChar(16), fieldMeta.dataType)
        .input('sortOrder', sql.Int, nextSortOrder)
        .query(`
          INSERT INTO dbo.tb_columns
            (table_id, scope, [key], label, source, source_field, data_type, writable, write_mechanism,
             is_default_visible, filterable, sortable, is_active, sort_order)
          VALUES
            (@tableId, @scope, @key, @label, 'source', @sourceField, @dataType, 0, NULL, 1, 1, 1, 1, @sortOrder)
        `);
      inserted += 1;
    }
    return inserted;
  }

  const headerFields = collectDiscoveredFields(records, 'header');
  const lineFields = collectDiscoveredFields(records, 'line');
  const [headerInserted, lineInserted] = await Promise.all([
    insertMissingForScope('master', headerFields),
    insertMissingForScope('detail', lineFields),
  ]);
  return { headerInserted, lineInserted };
}

// Content-hash over de geprojecteerde master- + detail-JSON (bron-neutraal; nieuw/gewijzigd-detectie).
function computeContentHash(masterJson, detailJsons) {
  const detailDigest = [...detailJsons].sort().join('|');
  return crypto.createHash('sha256').update(`${masterJson}¶${detailJsons.length}¶${detailDigest}`).digest('hex');
}

async function getStaleThresholdMinutes(table) {
  return Number.isFinite(table?.staleMinutes) && table.staleMinutes > 0 ? table.staleMinutes : 15;
}

async function getSyncState(tableId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .query('SELECT watermark, last_full_sync_at FROM dbo.tb_sync_state WHERE table_id = @tableId');
  const row = result.recordset[0] || {};
  return { watermark: row.watermark || null, lastFullSyncAt: row.last_full_sync_at || null };
}

async function isStale(tableKey) {
  const table = await getTableByKey(tableKey);
  if (table.cacheMode === 'never') return false;
  const { lastFullSyncAt } = await getSyncState(table.id);
  if (!lastFullSyncAt) return true;
  const thresholdMs = (await getStaleThresholdMinutes(table)) * 60 * 1000;
  return Date.now() - new Date(lastFullSyncAt).getTime() > thresholdMs;
}

// ---------------------------------------------------------------------------
// persistRecordsChunk — schrijft één batch masterrecords (+ hun details) set-based weg naar tb_cache.
// Aanpak: bulk-copy de geprojecteerde rijen naar twee staging-temptabellen op de transactie-connectie,
// draai daarna één MERGE (master) en één DELETE + INSERT (details). Zo verdwijnt het N+1-patroon
// (transactie + losse INSERT per order/regel) dat de refresh traag maakte.
// ---------------------------------------------------------------------------
async function persistRecordsChunk(pool, table, chunk, refreshStart, masterSource, detailSource) {
  const masterRows = [];
  const detailRows = [];
  let watermark = null;

  for (const rec of chunk) {
    if (!rec.partitionKey || !rec.recordKey) continue;
    const modifiedAt = toDateOrNull(rec.modifiedAt);
    if (modifiedAt && (!watermark || modifiedAt > watermark)) watermark = modifiedAt;

    const masterValues = isPlainObject(rec.masterRaw) ? { ...rec.masterRaw, ...rec.master } : rec.master;
    const masterJson = projectJson(masterValues, masterSource);
    const detailJsons = rec.details.map((d) => {
      const detailValues = isPlainObject(d.raw) ? { ...d.raw, ...d.values } : d.values;
      return projectJson(detailValues, detailSource);
    });
    const contentHash = computeContentHash(masterJson, detailJsons);

    masterRows.push({
      partitionKey: rec.partitionKey,
      recordKey: rec.recordKey,
      dataJson: masterJson,
      modifiedAt,
      contentHash,
    });
    for (let i = 0; i < rec.details.length; i += 1) {
      const detail = rec.details[i];
      if (detail.detailKey === null || detail.detailKey === undefined) continue;
      detailRows.push({
        partitionKey: rec.partitionKey,
        recordKey: rec.recordKey,
        detailKey: detail.detailKey,
        dataJson: detailJsons[i],
      });
    }
  }

  if (!masterRows.length) return { saved: 0, watermark };

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    // Staging-temptabellen aanmaken via .batch() (géén sp_executesql), zodat ze op de connectie blijven
    // bestaan voor de bulk-copy en de daaropvolgende MERGE/INSERT binnen dezelfde transactie.
    await new sql.Request(tx).batch(`
      IF OBJECT_ID('tempdb..#stg_master') IS NOT NULL DROP TABLE #stg_master;
      IF OBJECT_ID('tempdb..#stg_detail') IS NOT NULL DROP TABLE #stg_detail;
      CREATE TABLE #stg_master (
        partition_key NVARCHAR(32)  NOT NULL,
        record_key    NVARCHAR(128) NOT NULL,
        data_json     NVARCHAR(MAX) NOT NULL,
        modified_at   DATETIME2     NULL,
        content_hash  NVARCHAR(64)  NOT NULL
      );
      CREATE TABLE #stg_detail (
        partition_key NVARCHAR(32)  NOT NULL,
        record_key    NVARCHAR(128) NOT NULL,
        detail_key    INT           NOT NULL,
        data_json     NVARCHAR(MAX) NOT NULL
      );
    `);

    const masterTable = new sql.Table('#stg_master');
    masterTable.create = false;
    masterTable.columns.add('partition_key', sql.NVarChar(32), { nullable: false });
    masterTable.columns.add('record_key', sql.NVarChar(128), { nullable: false });
    masterTable.columns.add('data_json', sql.NVarChar(sql.MAX), { nullable: false });
    masterTable.columns.add('modified_at', sql.DateTime2, { nullable: true });
    masterTable.columns.add('content_hash', sql.NVarChar(64), { nullable: false });
    for (const r of masterRows) {
      masterTable.rows.add(r.partitionKey, r.recordKey, r.dataJson, r.modifiedAt, r.contentHash);
    }
    await new sql.Request(tx).bulk(masterTable);

    if (detailRows.length) {
      const detailTable = new sql.Table('#stg_detail');
      detailTable.create = false;
      detailTable.columns.add('partition_key', sql.NVarChar(32), { nullable: false });
      detailTable.columns.add('record_key', sql.NVarChar(128), { nullable: false });
      detailTable.columns.add('detail_key', sql.Int, { nullable: false });
      detailTable.columns.add('data_json', sql.NVarChar(sql.MAX), { nullable: false });
      for (const r of detailRows) {
        detailTable.rows.add(r.partitionKey, r.recordKey, r.detailKey, r.dataJson);
      }
      await new sql.Request(tx).bulk(detailTable);
    }

    // Master: één set-based MERGE (nieuw/gewijzigd-detectie via content_hash blijft identiek).
    await new sql.Request(tx)
      .input('tableId', sql.BigInt, table.id)
      .input('syncedAt', sql.DateTime2, refreshStart)
      .query(`
        MERGE dbo.tb_cache AS target
        USING (SELECT @tableId AS table_id, partition_key, record_key, data_json, modified_at, content_hash
               FROM #stg_master) AS src
          ON target.table_id = src.table_id AND target.scope = 'master'
             AND target.partition_key = src.partition_key AND target.record_key = src.record_key
             AND target.detail_key = ${MASTER_DETAIL_KEY}
        WHEN MATCHED THEN UPDATE SET
          data_json = src.data_json, source_modified_at = src.modified_at, synced_at = @syncedAt, removed_at_source = 0,
          content_changed_at = CASE WHEN ISNULL(target.content_hash, '') <> src.content_hash THEN @syncedAt ELSE target.content_changed_at END,
          content_hash = src.content_hash
        WHEN NOT MATCHED THEN INSERT
          (table_id, scope, partition_key, record_key, detail_key, data_json, source_modified_at,
           synced_at, first_seen_at, removed_at_source, content_hash, content_changed_at)
          VALUES (@tableId, 'master', src.partition_key, src.record_key, ${MASTER_DETAIL_KEY}, src.data_json, src.modified_at,
           @syncedAt, @syncedAt, 0, src.content_hash, @syncedAt);
      `);

    // Details: verwijder de bestaande regels van de records in deze chunk en herinsert set-based.
    await new sql.Request(tx)
      .input('tableId', sql.BigInt, table.id)
      .query(`
        DELETE d FROM dbo.tb_cache d
        INNER JOIN #stg_master m
          ON d.partition_key = m.partition_key AND d.record_key = m.record_key
        WHERE d.table_id = @tableId AND d.scope = 'detail';
      `);

    if (detailRows.length) {
      await new sql.Request(tx)
        .input('tableId', sql.BigInt, table.id)
        .input('syncedAt', sql.DateTime2, refreshStart)
        .query(`
          INSERT INTO dbo.tb_cache
            (table_id, scope, partition_key, record_key, detail_key, data_json, synced_at, first_seen_at, removed_at_source)
          SELECT @tableId, 'detail', partition_key, record_key, detail_key, data_json, @syncedAt, @syncedAt, 0
          FROM #stg_detail;
        `);
    }

    await new sql.Request(tx).batch(`
      IF OBJECT_ID('tempdb..#stg_master') IS NOT NULL DROP TABLE #stg_master;
      IF OBJECT_ID('tempdb..#stg_detail') IS NOT NULL DROP TABLE #stg_detail;
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  return { saved: masterRows.length, watermark };
}

// ---------------------------------------------------------------------------
// refresh — volledige resync vanuit de bron naar tb_cache (master + detail, data_json)
// ---------------------------------------------------------------------------
async function refresh(tableKey) {
  const table = await getTableByKey(tableKey);
  if (table.cacheMode === 'never') {
    resetRefreshProgress(tableKey, {
      status: 'done',
      finishedAt: new Date().toISOString(),
    });
    return { orders: 0, truncated: false, syncedAt: null, skipped: 'cache_mode=never' };
  }
  const adapter = getFetchAdapter(table);
  const refreshStart = new Date();
  resetRefreshProgress(tableKey, {
    status: 'fetching',
    startedAt: refreshStart.toISOString(),
  });

  const handleFetchProgress = (progress) => {
    const fetched = Number(progress?.fetched) || 0;
    const totalToFetchRaw = Number(progress?.totalToFetch);
    const sourceTotalRaw = Number(progress?.sourceTotal);
    const pagesFetched = Number(progress?.pagesFetched) || 0;
    updateRefreshProgress(tableKey, {
      status: 'fetching',
      fetched,
      totalToFetch: Number.isFinite(totalToFetchRaw) ? totalToFetchRaw : null,
      sourceTotal: Number.isFinite(sourceTotalRaw) ? sourceTotalRaw : null,
      pagesFetched,
      truncated: Boolean(progress?.truncated),
      error: null,
    });
  };

  try {
    const { records, total, truncated } = await adapter(table, { onProgress: handleFetchProgress });
    const progressBeforeSave = getRefreshProgress(tableKey);
    const totalToFetch = Number.isFinite(Number(progressBeforeSave.totalToFetch))
      ? Number(progressBeforeSave.totalToFetch)
      : records.length;
    const sourceTotal = Number.isFinite(Number(progressBeforeSave.sourceTotal))
      ? Number(progressBeforeSave.sourceTotal)
      : (Number.isFinite(Number(total)) ? Number(total) : null);
    const pagesFetched = Number(progressBeforeSave.pagesFetched) || 0;

    updateRefreshProgress(tableKey, {
      status: 'saving',
      fetched: records.length,
      totalToFetch,
      saved: 0,
      totalToSave: records.length,
      sourceTotal,
      pagesFetched,
      truncated: Boolean(truncated),
      error: null,
    });

    try {
      const { headerInserted, lineInserted } = await syncSourceColumnsFromRecords(table, records);
      if (headerInserted || lineInserted) {
        logger.info('tb_columns uitgebreid met ontdekte bronvelden', {
          tableKey,
          headerInserted,
          lineInserted,
        });
      }
    } catch (discoveryErr) {
      logger.warn('Bronveld-discovery voor tb_columns mislukt; refresh gaat door', {
        tableKey,
        error: discoveryErr.message,
      });
    }
    const [masterCols, detailCols] = await Promise.all([
      listColumns({ tableId: table.id, scope: 'master', includeInactive: true }),
      listColumns({ tableId: table.id, scope: 'detail', includeInactive: true }),
    ]);
    const masterSource = masterCols.filter((c) => c.source === 'source');
    const detailSource = detailCols.filter((c) => c.source === 'source');
    if (truncated) {
      logger.warn('tb_cache sync afgekapt op de cap; verfijn de scope voor volledige dekking', {
        tableKey, opgehaald: records.length, totaalInBron: total,
      });
    }

    const pool = await getPool();
    let watermark = null;
    let saved = 0;

    const validRecords = records.filter((rec) => rec.partitionKey && rec.recordKey);
    for (let offset = 0; offset < validRecords.length; offset += SAVE_CHUNK_SIZE) {
      const chunk = validRecords.slice(offset, offset + SAVE_CHUNK_SIZE);
      const { saved: chunkSaved, watermark: chunkWatermark } =
        await persistRecordsChunk(pool, table, chunk, refreshStart, masterSource, detailSource);
      if (chunkWatermark && (!watermark || chunkWatermark > watermark)) watermark = chunkWatermark;
      saved += chunkSaved;
      updateRefreshProgress(tableKey, {
        status: 'saving',
        fetched: records.length,
        totalToFetch,
        saved,
        totalToSave: records.length,
        sourceTotal,
        pagesFetched,
        truncated: Boolean(truncated),
      });
    }

    await pool.request()
      .input('tableId', sql.BigInt, table.id)
      .input('refreshStart', sql.DateTime2, refreshStart)
      .query(`
        UPDATE dbo.tb_cache
        SET removed_at_source = CASE WHEN synced_at < @refreshStart THEN 1 ELSE 0 END
        WHERE table_id = @tableId AND scope = 'master'
      `);

    await pool.request()
      .input('tableId', sql.BigInt, table.id)
      .input('watermark', sql.DateTime2, watermark)
      .input('syncedAt', sql.DateTime2, refreshStart)
      .query(`
        MERGE dbo.tb_sync_state AS target
        USING (SELECT @tableId AS table_id) AS src ON target.table_id = src.table_id
        WHEN MATCHED THEN UPDATE SET watermark = @watermark, last_full_sync_at = @syncedAt, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT (table_id, watermark, last_full_sync_at) VALUES (@tableId, @watermark, @syncedAt);
      `);

    logger.info('tb_cache ververst', { tableKey, records: records.length, truncated });
    updateRefreshProgress(tableKey, {
      status: 'done',
      fetched: records.length,
      totalToFetch,
      saved: records.length,
      totalToSave: records.length,
      sourceTotal,
      pagesFetched,
      truncated: Boolean(truncated),
      finishedAt: new Date().toISOString(),
      error: null,
    });
    return { orders: records.length, truncated: Boolean(truncated), syncedAt: refreshStart.toISOString() };
  } catch (err) {
    updateRefreshProgress(tableKey, {
      status: 'error',
      finishedAt: new Date().toISOString(),
      error: err.message || 'Refresh mislukt',
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// fk_join lookup-verrijking (fundament voor de Excel-koppeling #AB:162; overgenomen uit #161):
// read-only afgeleide kolommen uit de cache van een andere tabel. Cache-gedreven, geen bron-call per rij.
// Excel-doeltabellen (provider 'excel') matchen partitie-loos (een Excel kent geen dataAreaId).
// ---------------------------------------------------------------------------
async function loadLookupEnrichment(table) {
  const lookups = await getLookups(table.id);
  if (!lookups.length) return { lookups: [], masterCols: [], detailCols: [] };

  const pool = await getPool();
  const enriched = [];
  const masterCols = [];
  const detailCols = [];

  for (const lk of lookups) {
    let targetTable;
    try {
      targetTable = await getTableByKey(lk.targetTableKey);
    } catch {
      continue; // doeltabel bestaat niet (meer) of is inactief -> lookup overslaan
    }
    const targetColumns = await listColumns({ tableId: targetTable.id, scope: 'master', includeInactive: false });
    const targetColByKey = new Map(targetColumns.map((c) => [c.key, c]));

    const partitionless = targetTable.source && targetTable.source.providerType === 'excel';

    const cacheRes = await pool.request()
      .input('tableId', sql.BigInt, targetTable.id)
      .query(`SELECT partition_key, record_key, data_json FROM dbo.tb_cache
              WITH (NOLOCK)
              WHERE table_id = @tableId AND scope = 'master' AND removed_at_source = 0`);
    const byKey = new Map();
    for (const r of cacheRes.recordset) {
      const mapKey = partitionless ? String(r.record_key) : `${String(r.partition_key).toLowerCase()}|${r.record_key}`;
      byKey.set(mapKey, parseJson(r.data_json));
    }

    const fieldEntries = Object.entries(lk.fields); // [afgeleide-kolom-key, doel-kolom-key]
    const synthetic = fieldEntries.map(([derivedKey, targetColKey]) => {
      const tc = targetColByKey.get(targetColKey);
      return {
        id: null,
        tableId: table.id,
        scope: lk.sourceScope,
        key: derivedKey,
        label: tc ? `${tc.label} (${targetTable.label})` : derivedKey,
        source: 'lookup',
        sourceField: null,
        dataType: tc ? tc.dataType : 'text',
        options: null,
        writable: false,
        writeMechanism: null,
        isDefaultVisible: true,
        filterable: false,
        sortable: true,
        isActive: true,
        sortOrder: 9000,
        lookup: { targetTableKey: lk.targetTableKey, targetColumnKey: targetColKey },
      };
    });
    if (lk.sourceScope === 'detail') detailCols.push(...synthetic);
    else masterCols.push(...synthetic);
    enriched.push({ ...lk, byKey, fieldEntries, partitionless });
  }

  return { lookups: enriched, masterCols, detailCols };
}

function applyLookups(valueBag, partitionKey, enrichedLookups, scope) {
  for (const lk of enrichedLookups) {
    if (lk.sourceScope !== scope) continue;
    const fkVal = valueBag[lk.sourceField];
    const hasFk = fkVal !== null && fkVal !== undefined && fkVal !== '';
    const lookupKey = lk.partitionless
      ? String(fkVal).trim()
      : `${String(partitionKey).toLowerCase()}|${String(fkVal).trim()}`;
    const targetData = hasFk ? lk.byKey.get(lookupKey) : null;
    for (const [derivedKey, targetColKey] of lk.fieldEntries) {
      valueBag[derivedKey] = targetData && targetColKey in targetData ? targetData[targetColKey] : null;
    }
  }
}

// ---------------------------------------------------------------------------
// read — bouw rijen uit tb_cache + actieve kolommen + eigen waarden
// ---------------------------------------------------------------------------
async function read({ tableKey, includeRemoved = false, userId = null } = {}) {
  const table = await getTableByKey(tableKey);
  const pool = await getPool();
  const [masterCols, detailCols] = await time('tb_read_cols', () => Promise.all([
    listColumns({ tableId: table.id, scope: 'master', includeInactive: false }),
    listColumns({ tableId: table.id, scope: 'detail', includeInactive: false }),
  ]));

  const lastViewedAt = await getLastViewedAt(userId, table.id);
  const lastViewedMs = lastViewedAt ? new Date(lastViewedAt).getTime() : null;

  // De drie tb_cache-reads getimed als tb_read_sql (zichtbaar in Server-Timing → Network → Timing).
  const { mastersResult, detailsResult, customResult } = await time('tb_read_sql', async () => {
    const mastersRes = await pool.request()
      .input('tableId', sql.BigInt, table.id)
      .query(`
        SELECT c.partition_key, c.record_key, c.data_json, c.source_modified_at, c.removed_at_source, c.first_seen_at, c.content_changed_at
        FROM dbo.tb_cache c WITH (NOLOCK)
        WHERE c.table_id = @tableId AND c.scope = 'master'
        ${includeRemoved ? '' : `AND c.removed_at_source = 0
          AND NOT EXISTS (
            SELECT 1 FROM dbo.tb_row_exclusions ex WITH (NOLOCK)
            WHERE ex.table_id = @tableId AND ex.partition_key = c.partition_key AND ex.record_key = c.record_key
          )`}
        ORDER BY c.record_key
      `);

    const detailsRes = await pool.request()
      .input('tableId', sql.BigInt, table.id)
      .query(`
        SELECT partition_key, record_key, detail_key, data_json
        FROM dbo.tb_cache WITH (NOLOCK)
        WHERE table_id = @tableId AND scope = 'detail'
        ORDER BY record_key, detail_key
      `);

    const customRes = await pool.request()
      .input('tableId', sql.BigInt, table.id)
      .query(`
        SELECT cv.column_id, c.[key], c.scope, c.data_type, cv.partition_key, cv.record_key,
               cv.detail_key, cv.value_text, cv.value_number, cv.value_date, cv.value_bool
        FROM dbo.tb_custom_values cv WITH (NOLOCK)
        INNER JOIN dbo.tb_columns c WITH (NOLOCK) ON c.id = cv.column_id
        WHERE cv.table_id = @tableId AND c.is_active = 1
      `);

    return { mastersResult: mastersRes, detailsResult: detailsRes, customResult: customRes };
  });

  const customByCell = new Map();
  for (const row of customResult.recordset) {
    const cellKey = `${row.partition_key}|${row.record_key}|${row.detail_key}`;
    let value = null;
    if (row.data_type === 'number') value = row.value_number !== null ? Number(row.value_number) : null;
    else if (row.data_type === 'date') value = row.value_date ? new Date(row.value_date).toISOString() : null;
    else if (row.data_type === 'boolean') value = row.value_bool === null ? null : Boolean(row.value_bool);
    else value = row.value_text;
    if (!customByCell.has(cellKey)) customByCell.set(cellKey, {});
    customByCell.get(cellKey)[row.key] = value;
  }

  const detailsByRecord = new Map();
  for (const d of detailsResult.recordset) {
    const recKey = `${d.partition_key}|${d.record_key}`;
    if (!detailsByRecord.has(recKey)) detailsByRecord.set(recKey, []);
    detailsByRecord.get(recKey).push(d);
  }

  function valuesFor(cols, sourceJson, custom) {
    const values = {};
    for (const col of cols) {
      if (col.source === 'source') values[col.key] = col.key in sourceJson ? sourceJson[col.key] : null;
      else values[col.key] = custom && col.key in custom ? custom[col.key] : null;
    }
    return values;
  }

  const enrichment = await loadLookupEnrichment(table);

  let newCount = 0;
  let changedCount = 0;
  const rows = mastersResult.recordset.map((m) => {
    const recKey = `${m.partition_key}|${m.record_key}`;
    const masterJson = parseJson(m.data_json);
    const masterCustom = customByCell.get(`${m.partition_key}|${m.record_key}|${MASTER_DETAIL_KEY}`) || {};
    const details = (detailsByRecord.get(recKey) || []).map((d) => {
      const detailCustom = customByCell.get(`${d.partition_key}|${d.record_key}|${d.detail_key}`) || {};
      const detailValues = valuesFor(detailCols, parseJson(d.data_json), detailCustom);
      applyLookups(detailValues, d.partition_key, enrichment.lookups, 'detail');
      return { detailKey: d.detail_key, values: detailValues };
    });

    const firstSeenMs = m.first_seen_at ? new Date(m.first_seen_at).getTime() : null;
    const changedMs = m.content_changed_at ? new Date(m.content_changed_at).getTime() : null;
    const isNew = lastViewedMs !== null && firstSeenMs !== null && firstSeenMs > lastViewedMs;
    const isChanged = !isNew && lastViewedMs !== null && changedMs !== null && changedMs > lastViewedMs;
    if (isNew) newCount += 1;
    else if (isChanged) changedCount += 1;

    const masterValues = valuesFor(masterCols, masterJson, masterCustom);
    applyLookups(masterValues, m.partition_key, enrichment.lookups, 'master');

    return {
      partitionKey: m.partition_key,
      recordKey: m.record_key,
      removedAtSource: Boolean(m.removed_at_source),
      isNew,
      isChanged,
      values: masterValues,
      details,
      detailCount: details.length,
    };
  });

  const { lastFullSyncAt } = await getSyncState(table.id);
  const staleThresholdMinutes = await getStaleThresholdMinutes(table);
  const stale = table.cacheMode === 'never'
    ? false
    : (!lastFullSyncAt || (Date.now() - new Date(lastFullSyncAt).getTime() > staleThresholdMinutes * 60 * 1000));

  return {
    table: { key: table.key, label: table.label, hasDetail: Boolean(table.relation && table.relation.kind !== 'none') },
    syncedAt: lastFullSyncAt ? new Date(lastFullSyncAt).toISOString() : null,
    stale,
    hasCache: Boolean(lastFullSyncAt),
    staleThresholdMinutes,
    meta: {
      columns: {
        master: [...masterCols, ...enrichment.masterCols],
        detail: [...detailCols, ...enrichment.detailCols],
      },
    },
    rows,
    total: rows.length,
    lastViewedAt: lastViewedAt ? new Date(lastViewedAt).toISOString() : null,
    newCount,
    changedCount,
  };
}

// ---------------------------------------------------------------------------
// Nieuw-detectie per gebruiker
// ---------------------------------------------------------------------------
async function getLastViewedAt(userId, tableId) {
  if (!userId) return null;
  const pool = await getPool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .input('tableId', sql.BigInt, tableId)
    .query('SELECT last_viewed_at FROM dbo.tb_user_view_state WHERE user_id = @userId AND table_id = @tableId');
  return result.recordset.length ? result.recordset[0].last_viewed_at : null;
}

async function markViewed(userId, tableKey) {
  if (!userId) throw Object.assign(new Error('Geen gebruiker'), { status: 401 });
  const table = await getTableByKey(tableKey);
  const pool = await getPool();
  await pool.request()
    .input('userId', sql.Int, userId)
    .input('tableId', sql.BigInt, table.id)
    .query(`
      MERGE dbo.tb_user_view_state AS target
      USING (SELECT @tableId AS table_id, @userId AS user_id) AS src
        ON target.table_id = src.table_id AND target.user_id = src.user_id
      WHEN MATCHED THEN UPDATE SET last_viewed_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (table_id, user_id, last_viewed_at) VALUES (@tableId, @userId, SYSUTCDATETIME());
    `);
  return { success: true };
}

// ---------------------------------------------------------------------------
// saveCustomValue — instant SQL-write van een app-native kolomwaarde
// ---------------------------------------------------------------------------
async function saveCustomValue({ tableKey, columnId, partitionKey, recordKey, detailKey, value }, userId) {
  const table = await getTableByKey(tableKey);
  const { getColumnById } = require('./TableRegistryService');
  const column = await getColumnById(columnId);
  if (!column || !column.isActive || column.tableId !== table.id) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  if (column.source !== 'custom') {
    throw Object.assign(new Error('Alleen eigen kolommen zijn bewerkbaar'), { status: 400 });
  }

  const part = String(partitionKey || '').trim();
  const record = String(recordKey || '').trim();
  if (!part || !record) throw Object.assign(new Error('partitionKey en recordKey zijn verplicht'), { status: 400 });
  if (part.length > 32 || record.length > 128) throw Object.assign(new Error('partitionKey of recordKey is te lang'), { status: 400 });

  let resolvedDetail = MASTER_DETAIL_KEY;
  if (column.scope === 'detail') {
    const dk = toNumberOrNull(detailKey);
    if (dk === null) throw Object.assign(new Error('detailKey is verplicht voor een detail-kolom'), { status: 400 });
    resolvedDetail = dk;
  }

  let valueText = null, valueNumber = null, valueDate = null, valueBool = null;
  const empty = value === null || value === undefined || value === '';
  if (!empty) {
    if (column.dataType === 'number') {
      valueNumber = toNumberOrNull(value);
      if (valueNumber === null) throw Object.assign(new Error('Waarde moet een getal zijn'), { status: 400 });
    } else if (column.dataType === 'date') {
      valueDate = toDateOrNull(value);
      if (valueDate === null) throw Object.assign(new Error('Waarde moet een datum zijn'), { status: 400 });
    } else if (column.dataType === 'boolean') {
      valueBool = value === true || value === 'true' || value === 1 || value === '1' ? 1 : 0;
    } else if (column.dataType === 'select') {
      const allowed = Array.isArray(column.options) ? column.options : [];
      const str = String(value);
      if (allowed.length && !allowed.includes(str)) throw Object.assign(new Error('Waarde valt buiten de keuzelijst'), { status: 400 });
      valueText = str;
    } else {
      valueText = String(value);
    }
  }

  const pool = await getPool();
  // Waarde opslaan (primair) + de oude/nieuwe waarde opvangen in een table-variable. OUTPUT ... INTO mag
  // niet rechtstreeks naar tb_cell_history (FK/CHECK-doel verboden); we schrijven de historie daarna weg.
  const result = await pool.request()
    .input('columnId', sql.BigInt, columnId)
    .input('tableId', sql.BigInt, table.id)
    .input('scope', sql.NVarChar(16), column.scope)
    .input('partitionKey', sql.NVarChar(32), part)
    .input('recordKey', sql.NVarChar(128), record)
    .input('detailKey', sql.Int, resolvedDetail)
    .input('valueText', sql.NVarChar(sql.MAX), valueText)
    .input('valueNumber', sql.Decimal(38, 10), valueNumber)
    .input('valueDate', sql.DateTime2, valueDate)
    .input('valueBool', sql.Bit, valueBool)
    .input('userId', sql.Int, userId || null)
    .query(`
      DECLARE @changes TABLE (
        action NVARCHAR(16),
        old_value_text NVARCHAR(MAX), old_value_number DECIMAL(38,10), old_value_date DATETIME2, old_value_bool BIT,
        new_value_text NVARCHAR(MAX), new_value_number DECIMAL(38,10), new_value_date DATETIME2, new_value_bool BIT
      );
      MERGE dbo.tb_custom_values AS target
      USING (SELECT @columnId AS column_id, @partitionKey AS partition_key,
                    @recordKey AS record_key, @detailKey AS detail_key) AS src
        ON target.column_id = src.column_id AND target.partition_key = src.partition_key
           AND target.record_key = src.record_key AND target.detail_key = src.detail_key
      WHEN MATCHED THEN UPDATE SET
        value_text = @valueText, value_number = @valueNumber, value_date = @valueDate, value_bool = @valueBool,
        updated_by = @userId, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT
        (column_id, table_id, scope, partition_key, record_key, detail_key, value_text, value_number, value_date, value_bool, updated_by)
        VALUES (@columnId, @tableId, @scope, @partitionKey, @recordKey, @detailKey, @valueText, @valueNumber, @valueDate, @valueBool, @userId)
      OUTPUT
        CASE
          WHEN $action = 'INSERT' THEN 'insert'
          WHEN @valueText IS NULL AND @valueNumber IS NULL AND @valueDate IS NULL AND @valueBool IS NULL THEN 'clear'
          ELSE 'update'
        END,
        deleted.value_text, deleted.value_number, deleted.value_date, deleted.value_bool,
        inserted.value_text, inserted.value_number, inserted.value_date, inserted.value_bool
      INTO @changes (action, old_value_text, old_value_number, old_value_date, old_value_bool,
                     new_value_text, new_value_number, new_value_date, new_value_bool);
      SELECT action, old_value_text, old_value_number, old_value_date, old_value_bool,
             new_value_text, new_value_number, new_value_date, new_value_bool FROM @changes;
    `);

  // Cel-geschiedenis best-effort wegschrijven; een fout hier mag de (al opgeslagen) waarde niet laten mislukken.
  const change = result.recordset && result.recordset[0];
  if (change) {
    try {
      await pool.request()
        .input('columnId', sql.BigInt, columnId)
        .input('tableId', sql.BigInt, table.id)
        .input('scope', sql.NVarChar(16), column.scope)
        .input('partitionKey', sql.NVarChar(32), part)
        .input('recordKey', sql.NVarChar(128), record)
        .input('detailKey', sql.Int, resolvedDetail)
        .input('action', sql.NVarChar(16), change.action)
        .input('oldText', sql.NVarChar(sql.MAX), change.old_value_text)
        .input('oldNumber', sql.Decimal(38, 10), change.old_value_number)
        .input('oldDate', sql.DateTime2, change.old_value_date)
        .input('oldBool', sql.Bit, change.old_value_bool)
        .input('newText', sql.NVarChar(sql.MAX), change.new_value_text)
        .input('newNumber', sql.Decimal(38, 10), change.new_value_number)
        .input('newDate', sql.DateTime2, change.new_value_date)
        .input('newBool', sql.Bit, change.new_value_bool)
        .input('userId', sql.Int, userId || null)
        .query(`
          INSERT INTO dbo.tb_cell_history
            (column_id, table_id, scope, partition_key, record_key, detail_key, action,
             old_value_text, old_value_number, old_value_date, old_value_bool,
             new_value_text, new_value_number, new_value_date, new_value_bool, changed_by)
          VALUES (@columnId, @tableId, @scope, @partitionKey, @recordKey, @detailKey, @action,
             @oldText, @oldNumber, @oldDate, @oldBool, @newText, @newNumber, @newDate, @newBool, @userId);
        `);
    } catch (histErr) {
      logger.warn('tb-cel-geschiedenis wegschrijven mislukt (waarde zelf is opgeslagen)', { error: histErr.message });
    }
  }

  return { columnId, partitionKey: part, recordKey: record, detailKey: resolvedDetail, value: empty ? null : value };
}

// ---------------------------------------------------------------------------
// Row-exclusions (#AB:171): "SQL-only verwijderen" van masterrijen. Verwijderen = een persistente
// exclusion (geen harde delete), zodat een refresh de rij wel opnieuw ophaalt maar read() hem eruit
// filtert zolang de exclusion bestaat. Generalisatie van po_row_exclusions (master-niveau, per tabel).
// ---------------------------------------------------------------------------
const MAX_EXCLUSION_BATCH = 500;

// Pure normalisatie: accepteert [{partitionKey, recordKey}], trimt en dedupliceert, weert ongeldige.
function normalizeExclusionRows(rows) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const partitionKey = String(row?.partitionKey ?? '').trim();
    const recordKey = String(row?.recordKey ?? '').trim();
    if (!partitionKey || !recordKey) continue;
    if (partitionKey.length > 32 || recordKey.length > 128) continue;
    const dedupKey = `${partitionKey}|${recordKey}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    out.push({ partitionKey, recordKey });
  }
  return out;
}

async function excludeRows({ tableKey, rows }, userId) {
  const table = await getTableByKey(tableKey);
  const normalized = normalizeExclusionRows(rows);
  if (!normalized.length) throw Object.assign(new Error('Geen geldige rijen om te verwijderen'), { status: 400 });
  if (normalized.length > MAX_EXCLUSION_BATCH) {
    throw Object.assign(new Error(`Maximaal ${MAX_EXCLUSION_BATCH} rijen per keer`), { status: 400 });
  }
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    for (const { partitionKey, recordKey } of normalized) {
      await new sql.Request(tx)
        .input('tableId', sql.BigInt, table.id)
        .input('partitionKey', sql.NVarChar(32), partitionKey)
        .input('recordKey', sql.NVarChar(128), recordKey)
        .input('by', sql.Int, userId || null)
        .query(`
          MERGE dbo.tb_row_exclusions AS target
          USING (SELECT @tableId AS table_id, @partitionKey AS partition_key, @recordKey AS record_key) AS src
            ON target.table_id = src.table_id AND target.partition_key = src.partition_key AND target.record_key = src.record_key
          WHEN NOT MATCHED THEN
            INSERT (table_id, partition_key, record_key, reason, excluded_by)
            VALUES (@tableId, @partitionKey, @recordKey, 'manual_delete', @by);
        `);
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
  return { excluded: normalized.length };
}

async function includeRows({ tableKey, rows }) {
  const table = await getTableByKey(tableKey);
  const normalized = normalizeExclusionRows(rows);
  if (!normalized.length) throw Object.assign(new Error('Geen geldige rijen om terug te zetten'), { status: 400 });
  if (normalized.length > MAX_EXCLUSION_BATCH) {
    throw Object.assign(new Error(`Maximaal ${MAX_EXCLUSION_BATCH} rijen per keer`), { status: 400 });
  }
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    for (const { partitionKey, recordKey } of normalized) {
      await new sql.Request(tx)
        .input('tableId', sql.BigInt, table.id)
        .input('partitionKey', sql.NVarChar(32), partitionKey)
        .input('recordKey', sql.NVarChar(128), recordKey)
        .query(`DELETE FROM dbo.tb_row_exclusions
                WHERE table_id = @tableId AND partition_key = @partitionKey AND record_key = @recordKey`);
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
  return { included: normalized.length };
}

// Verborgen rijen die na de laatste sync nóg door de bron-scope zijn opgehaald (removed_at_source=0):
// die matchen de filter dus nog, maar zijn handmatig verborgen — signaal om terug te zetten. Toont de
// masterkolommen die admin voor de verwijder-popup zichtbaar zette (visibleAtDelete).
async function listHiddenInFilterRows(tableKey) {
  const table = await getTableByKey(tableKey);
  const pool = await getPool();
  const masterCols = (await listColumns({ tableId: table.id, scope: 'master', includeInactive: true }))
    .filter((col) => col.visibleAtDelete);

  const result = await pool.request()
    .input('tableId', sql.BigInt, table.id)
    .query(`
      SELECT c.partition_key, c.record_key, c.data_json, ex.excluded_at
      FROM dbo.tb_row_exclusions ex
      INNER JOIN dbo.tb_cache c
        ON c.table_id = ex.table_id AND c.scope = 'master'
       AND c.partition_key = ex.partition_key AND c.record_key = ex.record_key
      WHERE ex.table_id = @tableId AND c.removed_at_source = 0
      ORDER BY c.record_key
    `);

  const columns = masterCols.map((col) => ({ key: col.key, label: col.label, dataType: col.dataType }));
  const rows = result.recordset.map((r) => {
    const json = parseJson(r.data_json);
    const values = {};
    for (const col of masterCols) values[col.key] = col.key in json ? json[col.key] : null;
    return { partitionKey: r.partition_key, recordKey: r.record_key, excludedAt: normalizeOut(r.excluded_at), values };
  });
  return { count: rows.length, columns, rows };
}

// ---------------------------------------------------------------------------
// correctField — write-back van een bron-veld naar D365 (#AB:172, board-cutover Fase 3).
// Generalisatie van de po_*-write-back: valideert de tb_kolom (writable + mechanisme 'patch' + source_field),
// legt een tb_field_corrections-audit vast (pending -> applied/failed), en schrijft terug via de bestaande
// D365-writeBackField (met etag/concurrency-check). Bij succes wordt de tb_cache best-effort bijgewerkt.
// LET OP: writeBackField is nog PO-entiteit-gebonden (PurchaseOrderHeaders/Lines). Voor de purchase-orders-
// tabel klopt de mapping 1-op-1 (partitionKey=dataAreaId, recordKey=orderNumber, detailKey=lineNumber).
// TODO(#177): generieke PATCH via de SourceProvider zodra andere schrijfbare tabellen nodig zijn.
async function correctField({ tableKey, columnId, partitionKey, recordKey, detailKey, value, basedOnValue }, userId) {
  const table = await getTableByKey(tableKey);
  const { getColumnById } = require('./TableRegistryService');
  const column = await getColumnById(columnId);
  if (!column || !column.isActive || column.tableId !== table.id) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  if (column.source !== 'source' || !column.writable || column.writeMechanism !== 'patch' || !column.sourceField) {
    throw Object.assign(new Error('Deze kolom is niet ingesteld voor write-back naar D365'), { status: 400 });
  }

  const part = String(partitionKey || '').trim();
  const record = String(recordKey || '').trim();
  if (!part || !record) throw Object.assign(new Error('partitionKey en recordKey zijn verplicht'), { status: 400 });

  const level = column.scope === 'detail' ? 'line' : 'header';
  let resolvedDetail = MASTER_DETAIL_KEY;
  if (column.scope === 'detail') {
    const dk = toNumberOrNull(detailKey);
    if (dk === null) throw Object.assign(new Error('detailKey is verplicht voor een regel-kolom'), { status: 400 });
    resolvedDetail = dk;
  }

  let newValue;
  if (column.dataType === 'number') newValue = toNumberOrNull(value);
  else if (column.dataType === 'date') { const d = toDateOrNull(value); newValue = d ? d.toISOString() : null; }
  else if (column.dataType === 'boolean') newValue = value === true || value === 'true' || value === 1 || value === '1';
  else newValue = value === null || value === undefined ? null : String(value);

  const pool = await getPool();
  // 1) Audit: pending
  const ins = await pool.request()
    .input('columnId', sql.BigInt, columnId)
    .input('tableId', sql.BigInt, table.id)
    .input('scope', sql.NVarChar(16), column.scope)
    .input('partitionKey', sql.NVarChar(32), part)
    .input('recordKey', sql.NVarChar(128), record)
    .input('detailKey', sql.Int, resolvedDetail)
    .input('sourceField', sql.NVarChar(128), column.sourceField)
    .input('old', sql.NVarChar(sql.MAX), basedOnValue === null || basedOnValue === undefined ? null : String(basedOnValue))
    .input('new', sql.NVarChar(sql.MAX), newValue === null || newValue === undefined ? null : String(newValue))
    .input('by', sql.Int, userId || null)
    .query(`
      INSERT INTO dbo.tb_field_corrections
        (column_id, table_id, scope, partition_key, record_key, detail_key, source_field, old_value, new_value, status, created_by)
      OUTPUT INSERTED.id
      VALUES (@columnId, @tableId, @scope, @partitionKey, @recordKey, @detailKey, @sourceField, @old, @new, 'pending', @by);
    `);
  const correctionId = ins.recordset[0].id;

  // 2) Terugschrijven naar D365 (etag + concurrency-check zit in writeBackField).
  try {
    await writeBackField({
      level, dataAreaId: part, orderNumber: record, lineNumber: resolvedDetail,
      d365Field: column.sourceField, newValue, basedOnValue, dataType: column.dataType,
    });
  } catch (err) {
    await pool.request()
      .input('id', sql.BigInt, correctionId)
      .input('err', sql.NVarChar(sql.MAX), err.message || 'Onbekende fout')
      .query("UPDATE dbo.tb_field_corrections SET status = 'failed', error = @err WHERE id = @id");
    throw err;
  }

  // 3) Applied + tb_cache best-effort bijwerken (data_json op kolom-key; volgende refresh corrigeert hoe dan ook).
  await pool.request()
    .input('id', sql.BigInt, correctionId)
    .query("UPDATE dbo.tb_field_corrections SET status = 'applied', applied_at = SYSUTCDATETIME() WHERE id = @id");

  try {
    const cacheRow = await pool.request()
      .input('tableId', sql.BigInt, table.id)
      .input('scope', sql.NVarChar(16), column.scope)
      .input('partitionKey', sql.NVarChar(32), part)
      .input('recordKey', sql.NVarChar(128), record)
      .input('detailKey', sql.Int, resolvedDetail)
      .query(`SELECT data_json FROM dbo.tb_cache
              WHERE table_id = @tableId AND scope = @scope AND partition_key = @partitionKey
                AND record_key = @recordKey AND detail_key = @detailKey`);
    if (cacheRow.recordset.length) {
      const json = parseJson(cacheRow.recordset[0].data_json);
      json[column.key] = newValue;
      await pool.request()
        .input('tableId', sql.BigInt, table.id)
        .input('scope', sql.NVarChar(16), column.scope)
        .input('partitionKey', sql.NVarChar(32), part)
        .input('recordKey', sql.NVarChar(128), record)
        .input('detailKey', sql.Int, resolvedDetail)
        .input('dataJson', sql.NVarChar(sql.MAX), JSON.stringify(json))
        .query(`UPDATE dbo.tb_cache SET data_json = @dataJson
                WHERE table_id = @tableId AND scope = @scope AND partition_key = @partitionKey
                  AND record_key = @recordKey AND detail_key = @detailKey`);
    }
  } catch (err) {
    logger.warn('tb_cache bijwerken na write-back mislukt (niet-kritiek)', { error: err.message });
  }

  return { success: true, columnId, partitionKey: part, recordKey: record, detailKey: resolvedDetail, value: newValue };
}

// ---------------------------------------------------------------------------
// Cel-geschiedenis (#AB:173, cutover Fase 4): verenigde per-cel tijdlijn van eigen-kolom-edits
// (tb_cell_history) + D365-veldcorrecties (tb_field_corrections). Generalisatie van po_ getCellHistory.
// ---------------------------------------------------------------------------
function pickTypedValue({ text, number, date, bool }) {
  if (number !== null && number !== undefined) return Number(number);
  if (date !== null && date !== undefined) return date instanceof Date ? date.toISOString() : date;
  if (bool !== null && bool !== undefined) return Boolean(bool);
  return text === undefined ? null : text;
}

function formatHistoryRow(row) {
  return {
    source: row.source,                       // 'custom' | 'writeback'
    action: row.action,                       // 'insert' | 'update' | 'clear' | 'correct'
    at: row.at instanceof Date ? row.at.toISOString() : row.at,
    oldValue: pickTypedValue({ text: row.old_value_text, number: row.old_value_number, date: row.old_value_date, bool: row.old_value_bool }),
    newValue: pickTypedValue({ text: row.new_value_text, number: row.new_value_number, date: row.new_value_date, bool: row.new_value_bool }),
    status: row.status || null,               // alleen write-back (pending/applied/failed)
    reason: row.change_reason || null,
    user: (row.user_name || row.user_email)
      ? { name: row.user_name || null, email: row.user_email || null }
      : null,
  };
}

async function getCellHistory({ tableKey, columnId, partitionKey, recordKey, detailKey }) {
  const table = await getTableByKey(tableKey);
  const { getColumnById } = require('./TableRegistryService');
  const column = await getColumnById(columnId);
  if (!column || !column.isActive || column.tableId !== table.id) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  const part = String(partitionKey || '').trim();
  const record = String(recordKey || '').trim();
  if (!part || !record) throw Object.assign(new Error('partitionKey en recordKey zijn verplicht'), { status: 400 });
  if (part.length > 32 || record.length > 128) throw Object.assign(new Error('partitionKey of recordKey is te lang'), { status: 400 });

  let resolvedDetail = MASTER_DETAIL_KEY;
  if (column.scope === 'detail') {
    const dk = toNumberOrNull(detailKey);
    if (dk === null) throw Object.assign(new Error('detailKey is verplicht voor een regel-kolom'), { status: 400 });
    resolvedDetail = dk;
  }

  const pool = await getPool();
  const result = await pool.request()
    .input('columnId', sql.BigInt, columnId)
    .input('partitionKey', sql.NVarChar(32), part)
    .input('recordKey', sql.NVarChar(128), record)
    .input('detailKey', sql.Int, resolvedDetail)
    .query(`
      SELECT 'custom' AS source, h.action, h.changed_at AS at,
             h.old_value_text, h.old_value_number, h.old_value_date, h.old_value_bool,
             h.new_value_text, h.new_value_number, h.new_value_date, h.new_value_bool,
             CAST(NULL AS NVARCHAR(16)) AS status, h.change_reason,
             u.email AS user_email, u.display_name AS user_name
      FROM dbo.tb_cell_history h
      LEFT JOIN dbo.users u ON u.id = h.changed_by
      WHERE h.column_id = @columnId AND h.partition_key = @partitionKey
        AND h.record_key = @recordKey AND h.detail_key = @detailKey
      UNION ALL
      SELECT 'writeback' AS source, 'correct' AS action, c.created_at AS at,
             c.old_value AS old_value_text, CAST(NULL AS DECIMAL(38,10)) AS old_value_number, CAST(NULL AS DATETIME2) AS old_value_date, CAST(NULL AS BIT) AS old_value_bool,
             c.new_value AS new_value_text, CAST(NULL AS DECIMAL(38,10)) AS new_value_number, CAST(NULL AS DATETIME2) AS new_value_date, CAST(NULL AS BIT) AS new_value_bool,
             c.status, CAST(NULL AS NVARCHAR(512)) AS change_reason,
             u2.email AS user_email, u2.display_name AS user_name
      FROM dbo.tb_field_corrections c
      LEFT JOIN dbo.users u2 ON u2.id = c.created_by
      WHERE c.column_id = @columnId AND c.partition_key = @partitionKey
        AND c.record_key = @recordKey AND c.detail_key = @detailKey
      ORDER BY at DESC;
    `);
  return result.recordset.map(formatHistoryRow);
}

// ---------------------------------------------------------------------------
// getDataModel (#AB:174/#175, cutover Fase 5/6): admin-datamodel-payload op de tb_*-laag — entiteiten,
// relatie, kolommen (incl. verborgen, gemapt naar de admin-vorm), cache-stats en sync-filter. Vervangt
// het po_*-specifieke /datamodel zodat de admin-pagina generiek wordt. De D365-filtercatalogus wordt
// (voorlopig) hergebruikt uit de PO-cacheservice; in Fase 8 verhuist die mee naar de generieke laag.
const SYNC_TEMPLATES = [
  { id: 'open_orders', label: 'Open orders', rules: [{ level: 'header', field: 'PurchaseOrderStatus', operator: 'eq', valueType: 'enum', enumType: 'PurchStatus', value: 'Backorder' }] },
  { id: 'received_orders', label: 'Received orders', rules: [{ level: 'header', field: 'PurchaseOrderStatus', operator: 'eq', valueType: 'enum', enumType: 'PurchStatus', value: 'Received' }] },
];

// tb_-kolom -> admin-vorm die DataPreviewTables/useDataModelAdmin verwacht (level i.p.v. scope, d365 i.p.v. source).
function toAdminColumn(col) {
  return {
    id: col.id,
    key: col.key,
    label: col.label,
    level: col.scope === 'detail' ? 'line' : 'header',
    scope: col.scope,
    source: col.source === 'source' ? 'd365' : col.source, // admin-UI kent 'd365' | 'custom'
    dataType: col.dataType,
    options: col.options,
    d365Field: col.sourceField || null,
    writableToD365: Boolean(col.writable),
    writeMechanism: col.writeMechanism || null,
    isActive: Boolean(col.isActive),
    isDefaultVisible: Boolean(col.isDefaultVisible),
    visibleAtDelete: Boolean(col.visibleAtDelete),
    filterable: Boolean(col.filterable),
    sortable: Boolean(col.sortable),
    sortOrder: col.sortOrder,
  };
}

function normalizePreviewSampleValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function buildPreviewTableFromCacheRows(columns, cacheRows) {
  const d365Columns = (Array.isArray(columns) ? columns : []).filter(
    (column) => column.source === 'd365' && column.d365Field
  );
  const d365Fields = [...new Set(d365Columns.map((column) => String(column.d365Field)))];
  const rows = (Array.isArray(cacheRows) ? cacheRows : []).map((cacheRow) => {
    const source = parseJson(cacheRow?.data_json);
    const values = {};
    for (const column of d365Columns) {
      const preferred = Object.prototype.hasOwnProperty.call(source, column.key)
        ? source[column.key]
        : source[column.d365Field];
      values[column.d365Field] = preferred === undefined ? null : preferred;
    }
    return { values };
  });

  const sampleByField = {};
  for (const field of d365Fields) {
    sampleByField[field] = '—';
    for (let i = 0; i < rows.length; i += 1) {
      const candidate = rows[i]?.values?.[field];
      if (candidate === null || candidate === undefined || candidate === '') continue;
      sampleByField[field] = normalizePreviewSampleValue(candidate);
      break;
    }
  }

  return {
    columns: d365Fields,
    rows,
    sampledRows: rows.length,
    sampleByField,
  };
}

function getMissingPreviewFields(columns, sampleByField) {
  const fields = [...new Set(
    (Array.isArray(columns) ? columns : [])
      .filter((column) => column.source === 'd365' && column.d365Field)
      .map((column) => String(column.d365Field))
  )];
  return fields.filter((field) => {
    const current = sampleByField?.[field];
    return !current || current === '—';
  });
}

function fillMissingSamplesFromRawRows(previewTable, fields, rawRows) {
  if (!previewTable || !Array.isArray(fields) || !fields.length || !Array.isArray(rawRows) || !rawRows.length) {
    return previewTable;
  }
  const nextSampleByField = { ...(previewTable.sampleByField || {}) };
  for (const field of fields) {
    if (nextSampleByField[field] && nextSampleByField[field] !== '—') continue;
    for (let i = 0; i < rawRows.length; i += 1) {
      const candidate = rawRows[i]?.[field];
      if (candidate === null || candidate === undefined || candidate === '') continue;
      nextSampleByField[field] = normalizePreviewSampleValue(candidate);
      break;
    }
    if (!nextSampleByField[field]) nextSampleByField[field] = '—';
  }
  return {
    ...previewTable,
    sampleByField: nextSampleByField,
  };
}

async function getDataModel(tableKey) {
  const table = await getTableByKey(tableKey);
  const pool = await getPool();
  const [masterCols, detailCols] = await Promise.all([
    listColumns({ tableId: table.id, scope: 'master', includeInactive: true }),
    listColumns({ tableId: table.id, scope: 'detail', includeInactive: true }),
  ]);
  // lookup-kolommen zijn afgeleid/read-only en horen niet in de admin-config.
  const headerCols = masterCols.filter((c) => c.source !== 'lookup').map(toAdminColumn);
  const lineCols = detailCols.filter((c) => c.source !== 'lookup').map(toAdminColumn);

  const hasDetail = Boolean(table.relation && table.relation.kind && table.relation.kind !== 'none');

  const [headerPreviewRowsRes, linePreviewRowsRes] = await Promise.all([
    pool.request()
      .input('tableId', sql.BigInt, table.id)
      .input('rowLimit', sql.Int, DATA_MODEL_PREVIEW_ROW_LIMIT)
      .query(`
        SELECT TOP (@rowLimit) data_json
        FROM dbo.tb_cache WITH (NOLOCK)
        WHERE table_id = @tableId AND scope = 'master' AND removed_at_source = 0
        ORDER BY synced_at DESC, record_key ASC
      `),
    hasDetail
      ? pool.request()
        .input('tableId', sql.BigInt, table.id)
        .input('rowLimit', sql.Int, DATA_MODEL_PREVIEW_ROW_LIMIT)
        .query(`
          SELECT TOP (@rowLimit) data_json
          FROM dbo.tb_cache WITH (NOLOCK)
          WHERE table_id = @tableId AND scope = 'detail'
          ORDER BY synced_at DESC, record_key ASC, detail_key ASC
        `)
      : Promise.resolve({ recordset: [] }),
  ]);

  const [baseUrl, company, rulesJson] = await Promise.all([
    settingsService.getAsync('D365_ODATA_BASE_URL', ''),
    settingsService.getAsync('D365_ODATA_COMPANY', ''),
    settingsService.getAsync('PO_SYNC_RULES', ''),
  ]);
  const syncRules = parseSyncRules(rulesJson);
  let compiledFilter = '';
  try { compiledFilter = compileSyncRules(syncRules); } catch { compiledFilter = ''; }

  // Cache-stats uit tb_cache + tb_sync_state.
  const statsRes = await pool.request().input('t', sql.BigInt, table.id).query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.tb_cache WHERE table_id = @t AND scope = 'master' AND removed_at_source = 0) AS master_rows,
      (SELECT COUNT(*) FROM dbo.tb_cache WHERE table_id = @t AND scope = 'detail') AS detail_rows`);
  const { lastFullSyncAt } = await getSyncState(table.id);
  const cache = {
    masterRows: Number(statsRes.recordset[0]?.master_rows) || 0,
    detailRows: Number(statsRes.recordset[0]?.detail_rows) || 0,
    lastSyncedAt: lastFullSyncAt ? new Date(lastFullSyncAt).toISOString() : null,
  };

  // D365-filtercatalogus uit de admin-gemapte kolommen (generiek; geen po_-afhankelijkheid meer).
  const { buildFilterCatalogPayload } = require('../utils/tbSyncFilterCatalog');
  const filterMeta = buildFilterCatalogPayload([...headerCols, ...lineCols]);
  let previewTables = {
    header: buildPreviewTableFromCacheRows(headerCols, headerPreviewRowsRes.recordset),
    line: buildPreviewTableFromCacheRows(lineCols, linePreviewRowsRes.recordset),
  };
  const missingHeaderFields = getMissingPreviewFields(headerCols, previewTables.header.sampleByField);
  const missingLineFields = getMissingPreviewFields(lineCols, previewTables.line.sampleByField);
  if ((missingHeaderFields.length || missingLineFields.length) && table.key === 'purchase-orders') {
    try {
      const fallbackSample = await fetchPurchaseOrders({
        supplierAccount: null,
        top: DATA_MODEL_PREVIEW_ROW_LIMIT,
        skip: 0,
        fetchAll: false,
        extraFilter: compiledFilter,
        maxItems: DATA_MODEL_PREVIEW_ROW_LIMIT,
      });
      const headerRawRows = (fallbackSample.items || []).map((item) => item?.raw || {});
      const lineRawRows = (fallbackSample.items || []).flatMap((item) => (
        Array.isArray(item?.lines) ? item.lines.map((line) => line?.raw || {}) : []
      ));
      previewTables = {
        header: fillMissingSamplesFromRawRows(previewTables.header, missingHeaderFields, headerRawRows),
        line: fillMissingSamplesFromRawRows(previewTables.line, missingLineFields, lineRawRows),
      };
    } catch (err) {
      logger.warn('Fallback sample preview uit D365 mislukt; cache-samples blijven leidend', {
        tableKey,
        error: err.message,
      });
    }
  }

  return {
    entities: [
      { id: 'header', name: table.sourceEntity, title: `${table.label} (kop)`, path: table.sourceEntity, keys: table.keyFields, cacheTable: 'tb_cache' },
      ...(hasDetail ? [{ id: 'line', name: table.relation.detailSourceEntity || 'lines', title: `${table.label} (regels)`, expandedVia: table.relation.detailSourceEntity || null, keys: [...table.keyFields, 'LineNumber'], cacheTable: 'tb_cache' }] : []),
    ],
    relation: hasDetail ? {
      from: 'header', to: 'line', cardinality: '1:n', onFields: table.keyFields,
      description: 'Eén kop heeft meerdere regels (via $expand).',
    } : null,
    connection: { baseUrl: baseUrl.trim() || null, company: company.trim() || null },
    columns: { header: headerCols, line: lineCols },
    cache,
    syncFilter: { rules: syncRules, compiled: compiledFilter, operators: OPERATORS, maxRules: MAX_RULES, templates: SYNC_TEMPLATES },
    filterCatalog: filterMeta.catalog,
    previewTables,
  };
}

// Sync-filter-regels per tabel opslaan. v1: gedeelde PO_SYNC_RULES-setting (de tb_-sync leest die al);
// TODO(#174): per tabel in tb_tables.default_filter_json zodra meerdere schrijfbare bronnen nodig zijn.
async function saveSyncFilters(tableKey, rules) {
  await getTableByKey(tableKey); // valideer bestaan
  const list = Array.isArray(rules) ? rules : [];
  const compiled = compileSyncRules(list); // gooit 400 bij ongeldige regels
  await settingsService.set('PO_SYNC_RULES', JSON.stringify(list));
  return { rules: list, compiled };
}

// Tel hoeveel bron-rijen de filter matcht (impact-preview vóór verversen). Hergebruikt de PO-fetch;
// PO-specifiek tot de generieke provider-count er is (#177).
async function countSyncFilter(tableKey, rules) {
  await getTableByKey(tableKey);
  const compiled = compileSyncRules(Array.isArray(rules) ? rules : []);
  const result = await fetchPurchaseOrders({ supplierAccount: null, top: 1, skip: 0, fetchAll: false, extraFilter: compiled, maxItems: 1 });
  return { total: Number(result.total) || 0, compiled };
}

module.exports = {
  startRefresh,
  isRefreshRunning,
  refresh,
  getRefreshProgress,
  read,
  saveCustomValue,
  correctField,
  getCellHistory,
  getDataModel,
  saveSyncFilters,
  countSyncFilter,
  getSyncState,
  isStale,
  getLastViewedAt,
  markViewed,
  computeContentHash,
  applyLookups,
  normalizeExclusionRows,
  excludeRows,
  includeRows,
  listHiddenInFilterRows,
  FETCH_ADAPTERS,
};
