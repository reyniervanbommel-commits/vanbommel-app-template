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
const { fetchPurchaseOrders } = require('./D365ODataService');
const { getPool, getTableByKey, listColumns } = require('./TableRegistryService');
const { compileSyncRules, parseSyncRules } = require('../utils/odataSyncFilter');

const MASTER_DETAIL_KEY = -1; // sentinel: master-rij / master-niveau custom-waarde

// ---------------------------------------------------------------------------
// Fetch-adapters: vertalen een bron naar generieke records {partitionKey, recordKey, master, details}.
// TODO (Fase B / #139): vervang door SourceProvider.fetch(), geresolved uit tb_sources.provider_type.
// ---------------------------------------------------------------------------
async function purchaseOrdersFetch(table) {
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

  const result = await fetchPurchaseOrders({ supplierAccount: null, fetchAll: true, extraFilter, maxItems });
  const items = Array.isArray(result.items) ? result.items : [];

  const records = items.map((order) => {
    const raw = order.raw || {};
    return {
      partitionKey: String(raw.dataAreaId || company || '').trim(),
      recordKey: String(order.orderNumber || raw.PurchaseOrderNumber || '').trim(),
      modifiedAt: raw.ModifiedDateTime || null,
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
  for (const col of sourceColumns) json[col.key] = normalizeOut(source ? source[col.key] : null);
  return JSON.stringify(json);
}
function parseJson(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
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
// refresh — volledige resync vanuit de bron naar tb_cache (master + detail, data_json)
// ---------------------------------------------------------------------------
async function refresh(tableKey) {
  const table = await getTableByKey(tableKey);
  if (table.cacheMode === 'never') {
    return { orders: 0, truncated: false, syncedAt: null, skipped: 'cache_mode=never' };
  }
  const adapter = getFetchAdapter(table);
  const refreshStart = new Date();

  const [masterCols, detailCols] = await Promise.all([
    listColumns({ tableId: table.id, scope: 'master', includeInactive: false }),
    listColumns({ tableId: table.id, scope: 'detail', includeInactive: false }),
  ]);
  const masterSource = masterCols.filter((c) => c.source === 'source');
  const detailSource = detailCols.filter((c) => c.source === 'source');

  const { records, total, truncated } = await adapter(table);
  if (truncated) {
    logger.warn('tb_cache sync afgekapt op de cap; verfijn de scope voor volledige dekking', {
      tableKey, opgehaald: records.length, totaalInBron: total,
    });
  }

  const pool = await getPool();
  let watermark = null;

  for (const rec of records) {
    if (!rec.partitionKey || !rec.recordKey) continue;
    const modifiedAt = toDateOrNull(rec.modifiedAt);
    if (modifiedAt && (!watermark || modifiedAt > watermark)) watermark = modifiedAt;

    const masterJson = projectJson(rec.master, masterSource);
    const detailJsons = rec.details.map((d) => projectJson(d.values, detailSource));
    const contentHash = computeContentHash(masterJson, detailJsons);

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await new sql.Request(tx)
        .input('tableId', sql.BigInt, table.id)
        .input('partitionKey', sql.NVarChar(32), rec.partitionKey)
        .input('recordKey', sql.NVarChar(128), rec.recordKey)
        .input('dataJson', sql.NVarChar(sql.MAX), masterJson)
        .input('modifiedAt', sql.DateTime2, modifiedAt)
        .input('syncedAt', sql.DateTime2, refreshStart)
        .input('contentHash', sql.NVarChar(64), contentHash)
        .query(`
          MERGE dbo.tb_cache AS target
          USING (SELECT @tableId AS table_id, 'master' AS scope, @partitionKey AS partition_key,
                        @recordKey AS record_key, ${MASTER_DETAIL_KEY} AS detail_key) AS src
            ON target.table_id = src.table_id AND target.scope = src.scope
               AND target.partition_key = src.partition_key AND target.record_key = src.record_key
               AND target.detail_key = src.detail_key
          WHEN MATCHED THEN UPDATE SET
            data_json = @dataJson, source_modified_at = @modifiedAt, synced_at = @syncedAt, removed_at_source = 0,
            content_changed_at = CASE WHEN ISNULL(target.content_hash, '') <> @contentHash THEN @syncedAt ELSE target.content_changed_at END,
            content_hash = @contentHash
          WHEN NOT MATCHED THEN INSERT
            (table_id, scope, partition_key, record_key, detail_key, data_json, source_modified_at,
             synced_at, first_seen_at, removed_at_source, content_hash, content_changed_at)
            VALUES (@tableId, 'master', @partitionKey, @recordKey, ${MASTER_DETAIL_KEY}, @dataJson, @modifiedAt,
             @syncedAt, @syncedAt, 0, @contentHash, @syncedAt);
        `);

      await new sql.Request(tx)
        .input('tableId', sql.BigInt, table.id)
        .input('partitionKey', sql.NVarChar(32), rec.partitionKey)
        .input('recordKey', sql.NVarChar(128), rec.recordKey)
        .query(`DELETE FROM dbo.tb_cache
                WHERE table_id = @tableId AND scope = 'detail'
                  AND partition_key = @partitionKey AND record_key = @recordKey`);

      for (let i = 0; i < rec.details.length; i += 1) {
        const detail = rec.details[i];
        if (detail.detailKey === null || detail.detailKey === undefined) continue;
        await new sql.Request(tx)
          .input('tableId', sql.BigInt, table.id)
          .input('partitionKey', sql.NVarChar(32), rec.partitionKey)
          .input('recordKey', sql.NVarChar(128), rec.recordKey)
          .input('detailKey', sql.Int, detail.detailKey)
          .input('dataJson', sql.NVarChar(sql.MAX), detailJsons[i])
          .input('syncedAt', sql.DateTime2, refreshStart)
          .query(`
            INSERT INTO dbo.tb_cache
              (table_id, scope, partition_key, record_key, detail_key, data_json, synced_at, first_seen_at, removed_at_source)
            VALUES
              (@tableId, 'detail', @partitionKey, @recordKey, @detailKey, @dataJson, @syncedAt, @syncedAt, 0);
          `);
      }
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }
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
  return { orders: records.length, truncated: Boolean(truncated), syncedAt: refreshStart.toISOString() };
}

// ---------------------------------------------------------------------------
// read — bouw rijen uit tb_cache + actieve kolommen + eigen waarden
// ---------------------------------------------------------------------------
async function read({ tableKey, includeRemoved = false, userId = null } = {}) {
  const table = await getTableByKey(tableKey);
  const pool = await getPool();
  const [masterCols, detailCols] = await Promise.all([
    listColumns({ tableId: table.id, scope: 'master', includeInactive: false }),
    listColumns({ tableId: table.id, scope: 'detail', includeInactive: false }),
  ]);

  const lastViewedAt = await getLastViewedAt(userId, table.id);
  const lastViewedMs = lastViewedAt ? new Date(lastViewedAt).getTime() : null;

  const mastersResult = await pool.request()
    .input('tableId', sql.BigInt, table.id)
    .query(`
      SELECT c.partition_key, c.record_key, c.data_json, c.source_modified_at, c.removed_at_source, c.first_seen_at, c.content_changed_at
      FROM dbo.tb_cache c
      WHERE c.table_id = @tableId AND c.scope = 'master'
      ${includeRemoved ? '' : `AND c.removed_at_source = 0
        AND NOT EXISTS (
          SELECT 1 FROM dbo.tb_row_exclusions ex
          WHERE ex.table_id = @tableId AND ex.partition_key = c.partition_key AND ex.record_key = c.record_key
        )`}
      ORDER BY c.record_key
    `);

  const detailsResult = await pool.request()
    .input('tableId', sql.BigInt, table.id)
    .query(`
      SELECT partition_key, record_key, detail_key, data_json
      FROM dbo.tb_cache
      WHERE table_id = @tableId AND scope = 'detail'
      ORDER BY record_key, detail_key
    `);

  const customResult = await pool.request()
    .input('tableId', sql.BigInt, table.id)
    .query(`
      SELECT cv.column_id, c.[key], c.scope, c.data_type, cv.partition_key, cv.record_key,
             cv.detail_key, cv.value_text, cv.value_number, cv.value_date, cv.value_bool
      FROM dbo.tb_custom_values cv
      INNER JOIN dbo.tb_columns c ON c.id = cv.column_id
      WHERE cv.table_id = @tableId AND c.is_active = 1
    `);

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

  let newCount = 0;
  let changedCount = 0;
  const rows = mastersResult.recordset.map((m) => {
    const recKey = `${m.partition_key}|${m.record_key}`;
    const masterJson = parseJson(m.data_json);
    const masterCustom = customByCell.get(`${m.partition_key}|${m.record_key}|${MASTER_DETAIL_KEY}`) || {};
    const details = (detailsByRecord.get(recKey) || []).map((d) => {
      const detailCustom = customByCell.get(`${d.partition_key}|${d.record_key}|${d.detail_key}`) || {};
      return { detailKey: d.detail_key, values: valuesFor(detailCols, parseJson(d.data_json), detailCustom) };
    });

    const firstSeenMs = m.first_seen_at ? new Date(m.first_seen_at).getTime() : null;
    const changedMs = m.content_changed_at ? new Date(m.content_changed_at).getTime() : null;
    const isNew = lastViewedMs !== null && firstSeenMs !== null && firstSeenMs > lastViewedMs;
    const isChanged = !isNew && lastViewedMs !== null && changedMs !== null && changedMs > lastViewedMs;
    if (isNew) newCount += 1;
    else if (isChanged) changedCount += 1;

    return {
      partitionKey: m.partition_key,
      recordKey: m.record_key,
      removedAtSource: Boolean(m.removed_at_source),
      isNew,
      isChanged,
      values: valuesFor(masterCols, masterJson, masterCustom),
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
    meta: { columns: { master: masterCols, detail: detailCols } },
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
  await pool.request()
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
        VALUES (@columnId, @tableId, @scope, @partitionKey, @recordKey, @detailKey, @valueText, @valueNumber, @valueDate, @valueBool, @userId);
    `);

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

module.exports = {
  refresh,
  read,
  saveCustomValue,
  getSyncState,
  isStale,
  getLastViewedAt,
  markViewed,
  computeContentHash,
  normalizeExclusionRows,
  excludeRows,
  includeRows,
  listHiddenInFilterRows,
  FETCH_ADAPTERS,
};
