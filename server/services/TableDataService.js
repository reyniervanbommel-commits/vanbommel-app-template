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
const { getPool, getTableByKey, listColumns, getLookups } = require('./TableRegistryService');
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

// Bespoke adapters voor tabellen met bijzondere fetch-logica (PO: $expand naar lines + vendor-verrijking).
// Nieuwe, platte entiteiten (vendors/items) lopen via de generieke provider, geresolved op provider_type.
const FETCH_ADAPTERS = {
  'purchase-orders': purchaseOrdersFetch,
};

const SOURCE_PROVIDERS = {
  d365_odata: () => require('./sources/D365ODataProvider').fetch,
};

// Kies de fetch-strategie: bespoke adapter heeft voorrang; anders de generieke provider op provider_type.
function getFetchAdapter(table) {
  const bespoke = FETCH_ADAPTERS[table.key];
  if (bespoke) return bespoke;
  const providerType = table.source && table.source.providerType;
  const provider = providerType && SOURCE_PROVIDERS[providerType];
  if (!provider) {
    throw Object.assign(
      new Error(`Geen fetch-strategie voor tabel '${table.key}' (provider_type=${providerType || 'onbekend'})`),
      { status: 501 },
    );
  }
  return provider();
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
// fk_join lookup-verrijking (#AB:161): read-only afgeleide kolommen uit de cache van een andere tabel.
// Cache-gedreven: geen extra bron-call per rij. Ontbrekende doel-cache -> lege waarde (graceful).
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

    // Excel-datasets (#AB:162) zijn partitie-loos: een geuploade Excel kent geen dataAreaId. Voor zulke
    // doeltabellen matchen we alleen op record_key; voor bron-tabellen (d365) blijft de match partitie-gebonden.
    const partitionless = targetTable.source && targetTable.source.providerType === 'excel';

    // v1: de match loopt tegen de doel-record_key (targetKeyField valt daar per definitie mee samen in de
    // seed). TODO(perf #AB:161): dit laadt de volledige doel-cache (tot max_rows) in geheugen per read();
    // bij grote vendor/item-sets cachen met korte TTL of de join naar SQL (JSON_VALUE) verplaatsen.
    const cacheRes = await pool.request()
      .input('tableId', sql.BigInt, targetTable.id)
      .query(`SELECT partition_key, record_key, data_json FROM dbo.tb_cache
              WHERE table_id = @tableId AND scope = 'master' AND removed_at_source = 0`);
    const byKey = new Map();
    // partition case-insensitief (dataAreaId kan als 'whsl' of via de company-fallback als 'WHSL' binnenkomen).
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
  const [masterCols, detailCols] = await Promise.all([
    listColumns({ tableId: table.id, scope: 'master', includeInactive: false }),
    listColumns({ tableId: table.id, scope: 'detail', includeInactive: false }),
  ]);

  const lastViewedAt = await getLastViewedAt(userId, table.id);
  const lastViewedMs = lastViewedAt ? new Date(lastViewedAt).getTime() : null;

  const mastersResult = await pool.request()
    .input('tableId', sql.BigInt, table.id)
    .query(`
      SELECT partition_key, record_key, data_json, source_modified_at, removed_at_source, first_seen_at, content_changed_at
      FROM dbo.tb_cache
      WHERE table_id = @tableId AND scope = 'master'
      ${includeRemoved ? '' : 'AND removed_at_source = 0'}
      ORDER BY record_key
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

module.exports = {
  refresh,
  read,
  saveCustomValue,
  getSyncState,
  isStale,
  getLastViewedAt,
  markViewed,
  computeContentHash,
  applyLookups,
  FETCH_ADAPTERS,
};
