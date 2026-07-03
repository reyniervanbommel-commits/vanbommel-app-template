'use strict';

// SQL-cache voor D365 Purchase Orders + merge met de kolomregistry en eigen kolomwaarden.
// Fase 1 (#AB:132): lezen gaat altijd uit SQL; D365 wordt alleen geraadpleegd bij refresh.
// Write-back (po_field_corrections) volgt in Fase 3; per-user nieuw-detectie in Fase 2.

const crypto = require('crypto');
const sql = require('mssql');
const { logger } = require('../utils/logger');
const settingsService = require('./SettingsService');
const { fetchPurchaseOrders, writeBackField } = require('./D365ODataService');
const { listColumns, getColumnById } = require('./PurchaseOrderColumnsService');
const { compileSyncRules, parseSyncRules } = require('../utils/odataSyncFilter');

function normalizeOrderLines(lines) {
  const uniqueLines = new Map();
  let duplicateLineNumbers = 0;
  let invalidLineNumbers = 0;

  for (const line of Array.isArray(lines) ? lines : []) {
    const normalizedLineNumber = toNumberOrNull(line && line.lineNumber);
    if (normalizedLineNumber === null) {
      invalidLineNumbers += 1;
      continue;
    }
    if (uniqueLines.has(normalizedLineNumber)) {
      duplicateLineNumbers += 1;
    }
    uniqueLines.set(normalizedLineNumber, {
      ...(line || {}),
      lineNumber: normalizedLineNumber,
    });
  }

  return {
    lines: Array.from(uniqueLines.values()),
    duplicateLineNumbers,
    invalidLineNumbers,
  };
}

// Content-hash van een order (header + compacte regel-samenvatting). Wijzigt de hash tussen
// twee syncs, dan is de order "gewijzigd" (#133). ModifiedDateTime is niet beschikbaar in D365.
function computeOrderHash(order, normalizedLines = null) {
  const lines = normalizedLines || normalizeOrderLines(order.lines).lines;
  const lineDigest = lines
    .map((l) => [l.lineNumber, l.itemNumber, l.quantity, l.unit, l.lineAmount, l.description].join('~'))
    .sort()
    .join('|');
  const payload = [
    order.vendorAccount, order.vendorName, order.status, order.currencyCode,
    order.requestedDeliveryDate, order.createdDateTime, lines.length, lineDigest,
  ].join('¶');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

const DEFAULT_STALE_MINUTES = 15;
const HEADER_LEVEL_LINE = -1; // sentinel: header-niveau custom-waarde
// B2: begrens de cache-sync. Zonder scope haalt refresh alle ~19.913 orders met $expand op
// (gemeten ~21s per 200 rijen) en loopt vast. PO_SYNC_RULES = beheerde admin-filterregels,
// PO_SYNC_MAX_ORDERS = harde bovengrens als vangnet.
const DEFAULT_PO_SYNC_MAX_ORDERS = 2000;

const EMPTY_REFRESH_PROGRESS = {
  status: 'idle',
  fetched: 0,
  totalToFetch: null,
  sourceTotal: null,
  maxItems: null,
  pagesFetched: 0,
  truncated: false,
  startedAt: null,
  finishedAt: null,
  error: null,
};

let refreshProgress = { ...EMPTY_REFRESH_PROGRESS };
const READ_CACHE_TTL_MS = 30 * 1000;
const readCacheByScope = new Map();

function getReadCacheKey({ includeRemoved = false, userId = null } = {}) {
  return `${includeRemoved ? 1 : 0}|${userId ? Number(userId) : 0}`;
}

function getCachedReadPayload(scope) {
  const key = getReadCacheKey(scope);
  const entry = readCacheByScope.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    readCacheByScope.delete(key);
    return null;
  }
  return entry.payload;
}

function setCachedReadPayload(scope, payload) {
  const key = getReadCacheKey(scope);
  readCacheByScope.set(key, {
    payload,
    expiresAt: Date.now() + READ_CACHE_TTL_MS,
  });
}

function invalidateReadCache({ userId = null } = {}) {
  if (userId === null || userId === undefined) {
    readCacheByScope.clear();
    return;
  }
  const numericUserId = Number(userId);
  for (const key of readCacheByScope.keys()) {
    const parts = key.split('|');
    const keyUserId = Number(parts[1] || 0);
    if (keyUserId === numericUserId) {
      readCacheByScope.delete(key);
    }
  }
}

function updateRefreshProgress(patch) {
  refreshProgress = {
    ...refreshProgress,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

function getRefreshProgress() {
  return { ...refreshProgress };
}

function getPool() {
  return sql.connect(process.env.SQL_CONNECTION_STRING);
}

// DB-kolom → registry-key mapping (zodat read() per registry-kolom de juiste cachewaarde levert).
const HEADER_FIELD_BY_KEY = {
  orderNumber: 'order_number',
  vendorAccount: 'vendor_account',
  vendorName: 'vendor_name',
  status: 'status',
  currencyCode: 'currency_code',
  requestedDeliveryDate: 'requested_delivery_date',
  createdDateTime: 'created_date_time',
};
const LINE_FIELD_BY_KEY = {
  lineNumber: 'line_number',
  itemNumber: 'item_number',
  description: 'description',
  quantity: 'quantity',
  unit: 'unit',
  lineAmount: 'line_amount',
  currencyCode: 'currency_code',
  requestedDeliveryDate: 'requested_delivery_date',
};

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

async function getStaleThresholdMinutes() {
  const raw = await settingsService.getAsync('PO_CACHE_STALE_MINUTES', String(DEFAULT_STALE_MINUTES));
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STALE_MINUTES;
}

async function getSyncState() {
  const pool = await getPool();
  const result = await pool.request().query(
    'SELECT watermark, last_full_sync_at FROM dbo.po_sync_state WHERE id = 1'
  );
  const row = result.recordset[0] || {};
  return {
    watermark: row.watermark || null,
    lastFullSyncAt: row.last_full_sync_at || null,
  };
}

// Statistieken van de SQL-cache t.b.v. het admin-datamodeloverzicht.
async function getCacheStats() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.po_cache_headers WHERE removed_in_d365 = 0) AS header_count,
      (SELECT COUNT(*) FROM dbo.po_cache_headers WHERE removed_in_d365 = 1) AS removed_count,
      (SELECT COUNT(*) FROM dbo.po_cache_lines) AS line_count
  `);
  const row = result.recordset[0] || {};
  const { lastFullSyncAt } = await getSyncState();
  return {
    headerCount: Number(row.header_count) || 0,
    removedCount: Number(row.removed_count) || 0,
    lineCount: Number(row.line_count) || 0,
    lastFullSyncAt: lastFullSyncAt ? new Date(lastFullSyncAt).toISOString() : null,
    stale: await isStale(),
  };
}

function hasMeaningfulValue(value) {
  return value !== null && value !== undefined && value !== '' && typeof value !== 'object';
}

function normalizeSampleValue(value) {
  if (!hasMeaningfulValue(value)) return null;
  const str = String(value).trim();
  if (!str) return null;
  return str.length > 120 ? str.slice(0, 117) + '...' : str;
}

function inferDataType(value) {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'text';
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && value.trim() !== '') return 'number';
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime()) && /[T:-]/.test(value)) return 'date';
    return 'text';
  }
  return 'text';
}

function buildFieldCatalog(level, rows, d365LabelByField) {
  const byField = new Map();
  for (const row of rows) {
    for (const [field, value] of Object.entries(row || {})) {
      if (!hasMeaningfulValue(value)) continue;
      if (!byField.has(field)) {
        byField.set(field, {
          level,
          field,
          label: d365LabelByField.get(field) || field,
          nonEmptyCount: 0,
          sampleValues: [],
          dataTypeVotes: { text: 0, number: 0, date: 0 },
        });
      }
      const info = byField.get(field);
      info.nonEmptyCount += 1;
      info.dataTypeVotes[inferDataType(value)] += 1;
      const sample = normalizeSampleValue(value);
      if (sample && !info.sampleValues.includes(sample) && info.sampleValues.length < 5) {
        info.sampleValues.push(sample);
      }
    }
  }

  const totalRows = rows.length || 1;
  return Array.from(byField.values())
    .map((item) => {
      const voteEntries = Object.entries(item.dataTypeVotes);
      voteEntries.sort((a, b) => b[1] - a[1]);
      const inferredType = voteEntries[0][0];
      return {
        level: item.level,
        field: item.field,
        label: item.label,
        valueType: item.field === 'PurchaseOrderStatus' ? 'enum' : inferredType,
        nonEmptyCount: item.nonEmptyCount,
        fillRatio: Number((item.nonEmptyCount / totalRows).toFixed(3)),
        sampleValues: item.sampleValues,
      };
    })
    .sort((a, b) => {
      if (b.nonEmptyCount !== a.nonEmptyCount) return b.nonEmptyCount - a.nonEmptyCount;
      return a.field.localeCompare(b.field);
    });
}

function buildPreviewRows(rows, fields, keyBuilder, maxRows) {
  return rows.slice(0, maxRows).map((raw, idx) => ({
    id: keyBuilder(raw, idx),
    values: Object.fromEntries(fields.map((field) => [field, hasMeaningfulValue(raw[field]) ? raw[field] : null])),
  }));
}

// Catalogus met filterbare velden + voorbeeldtabellen voor admin-UI.
// Alleen velden met daadwerkelijke data in de cache worden teruggegeven.
async function getFilterFieldCatalogAndPreview() {
  const pool = await getPool();
  const [headersResult, linesResult, columns] = await Promise.all([
    pool.request().query(`
      SELECT TOP 1000 order_number, raw_json
      FROM dbo.po_cache_headers
      WHERE removed_in_d365 = 0 AND raw_json IS NOT NULL
      ORDER BY synced_at DESC
    `),
    pool.request().query(`
      SELECT TOP 2000 order_number, line_number, raw_json
      FROM dbo.po_cache_lines
      WHERE raw_json IS NOT NULL
      ORDER BY synced_at DESC
    `),
    listColumns({ includeInactive: true }),
  ]);

  const headerRows = headersResult.recordset.map((row) => {
    try { return JSON.parse(row.raw_json); } catch { return {}; }
  });
  const lineRows = linesResult.recordset.map((row) => {
    try { return JSON.parse(row.raw_json); } catch { return {}; }
  });

  const headerLabels = new Map(
    columns
      .filter((c) => c.level === 'header' && c.source === 'd365' && c.d365Field)
      .map((c) => [c.d365Field, c.label])
  );
  const lineLabels = new Map(
    columns
      .filter((c) => c.level === 'line' && c.source === 'd365' && c.d365Field)
      .map((c) => [c.d365Field, c.label])
  );

  const headerCatalog = buildFieldCatalog('header', headerRows, headerLabels);
  const lineCatalog = buildFieldCatalog('line', lineRows, lineLabels);

  const headerFields = headerCatalog.map((c) => c.field);
  const lineFields = lineCatalog.map((c) => c.field);
  const headerPreviewRows = buildPreviewRows(
    headerRows,
    headerFields,
    (raw, idx) => `${raw.PurchaseOrderNumber || raw.PurchId || idx}`,
    120
  );
  const linePreviewRows = buildPreviewRows(
    lineRows,
    lineFields,
    (raw, idx) => `${raw.PurchaseOrderNumber || 'po'}-${raw.LineNumber || idx}`,
    200
  );

  return {
    catalog: { header: headerCatalog, line: lineCatalog },
    preview: {
      header: { columns: headerFields, rows: headerPreviewRows, sampledRows: headerRows.length },
      line: { columns: lineFields, rows: linePreviewRows, sampledRows: lineRows.length },
    },
  };
}

async function isStale() {
  const { lastFullSyncAt } = await getSyncState();
  if (!lastFullSyncAt) return true;
  const thresholdMs = (await getStaleThresholdMinutes()) * 60 * 1000;
  return Date.now() - new Date(lastFullSyncAt).getTime() > thresholdMs;
}

// ---------------------------------------------------------------------------
// refresh — volledige resync vanuit D365 naar po_cache_headers/lines
// ---------------------------------------------------------------------------
async function getSyncScope() {
  const rawMax = await settingsService.getAsync('PO_SYNC_MAX_ORDERS', String(DEFAULT_PO_SYNC_MAX_ORDERS));
  const parsedMax = Number.parseInt(rawMax, 10);
  const maxItems = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : DEFAULT_PO_SYNC_MAX_ORDERS;

  // Gestructureerde regels (admin-UI) worden server-side gecompileerd naar OData-syntax.
  // Een compilefout mag de sync niet blokkeren: dan draait de sync zonder beheerde filterregels.
  let rulesFilter = '';
  try {
    rulesFilter = compileSyncRules(parseSyncRules(await settingsService.getAsync('PO_SYNC_RULES', '')));
  } catch (err) {
    logger.warn('PO_SYNC_RULES ongeldig; sync draait zonder gestructureerde filterregels', { error: err.message });
  }

  const clauses = [rulesFilter].filter(Boolean).map((c) => `(${c})`);
  return { extraFilter: clauses.join(' and '), maxItems };
}

async function refresh() {
  const company = (await settingsService.getAsync('D365_ODATA_COMPANY', '')).trim();
  const refreshStart = new Date();

  // B2: begrensde sync — beheerde filterregels + cap voorkomen dat refresh te zwaar wordt.
  const { extraFilter, maxItems } = await getSyncScope();
  refreshProgress = {
    ...EMPTY_REFRESH_PROGRESS,
    status: 'fetching',
    maxItems,
    startedAt: refreshStart.toISOString(),
    updatedAt: refreshStart.toISOString(),
  };

  let result;
  try {
    result = await fetchPurchaseOrders({
      supplierAccount: null,
      fetchAll: true,
      extraFilter,
      maxItems,
      onProgress: (progress) => updateRefreshProgress({ status: 'fetching', ...progress }),
    });
  } catch (err) {
    updateRefreshProgress({
      status: 'error',
      finishedAt: new Date().toISOString(),
      error: err.message || 'D365-refresh mislukt',
    });
    throw err;
  }
  try {
    const items = Array.isArray(result.items) ? result.items : [];
    updateRefreshProgress({
      status: 'saving',
      fetched: items.length,
      totalToFetch: refreshProgress.totalToFetch ?? Math.min(result.total || items.length, maxItems),
      sourceTotal: refreshProgress.sourceTotal ?? result.total ?? null,
      truncated: Boolean(result.truncated),
    });
    if (result.truncated) {
      logger.warn('PO-cache sync afgekapt op de cap; verfijn PO_SYNC_RULES voor volledige dekking', {
        cap: maxItems, opgehaald: items.length, totaalInD365: result.total,
      });
    }
    const pool = await getPool();
    let watermark = null;

    for (const order of items) {
    const raw = order.raw || {};
    const dataAreaId = String(raw.dataAreaId || company || '').trim();
    const orderNumber = String(order.orderNumber || raw.PurchaseOrderNumber || '').trim();
    if (!dataAreaId || !orderNumber) continue;

    const modifiedAt = toDateOrNull(raw.ModifiedDateTime);
    if (modifiedAt && (!watermark || modifiedAt > watermark)) watermark = modifiedAt;

    const {
      lines,
      duplicateLineNumbers,
      invalidLineNumbers,
    } = normalizeOrderLines(order.lines);
    const contentHash = computeOrderHash(order, lines);
    if (duplicateLineNumbers > 0 || invalidLineNumbers > 0) {
      logger.warn('PO-regels genormaliseerd vóór cache-opslag', {
        dataAreaId,
        orderNumber,
        duplicates: duplicateLineNumbers,
        invalid: invalidLineNumbers,
      });
    }

    // Header + regels per order atomair: voorkomt een header zonder regels als de
    // refresh halverwege faalt (delete + insert van regels mag niet half slagen).
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      await new sql.Request(tx)
        .input('dataAreaId', sql.NVarChar(16), dataAreaId)
        .input('orderNumber', sql.NVarChar(64), orderNumber)
        .input('vendorAccount', sql.NVarChar(64), order.vendorAccount || null)
        .input('vendorName', sql.NVarChar(256), order.vendorName || null)
        .input('status', sql.NVarChar(64), order.status || null)
        .input('currencyCode', sql.NVarChar(8), order.currencyCode || null)
        .input('requestedDeliveryDate', sql.DateTime2, toDateOrNull(order.requestedDeliveryDate))
        .input('createdDateTime', sql.DateTime2, toDateOrNull(order.createdDateTime))
        .input('modifiedAt', sql.DateTime2, modifiedAt)
        .input('rawJson', sql.NVarChar(sql.MAX), JSON.stringify(raw))
        .input('syncedAt', sql.DateTime2, refreshStart)
        .input('contentHash', sql.NVarChar(64), contentHash)
        .query(`
          MERGE dbo.po_cache_headers AS target
          USING (SELECT @dataAreaId AS data_area_id, @orderNumber AS order_number) AS src
            ON target.data_area_id = src.data_area_id AND target.order_number = src.order_number
          WHEN MATCHED THEN UPDATE SET
            vendor_account = @vendorAccount, vendor_name = @vendorName, status = @status,
            currency_code = @currencyCode, requested_delivery_date = @requestedDeliveryDate,
            created_date_time = @createdDateTime, d365_modified_at = @modifiedAt,
            raw_json = @rawJson, synced_at = @syncedAt, removed_in_d365 = 0,
            -- "gewijzigd": alleen bijwerken als de hash daadwerkelijk verandert.
            content_changed_at = CASE WHEN ISNULL(target.content_hash, '') <> @contentHash THEN @syncedAt ELSE target.content_changed_at END,
            content_hash = @contentHash
          WHEN NOT MATCHED THEN INSERT
            (data_area_id, order_number, vendor_account, vendor_name, status, currency_code,
             requested_delivery_date, created_date_time, d365_modified_at, raw_json, synced_at, first_seen_at, removed_in_d365,
             content_hash, content_changed_at)
            VALUES (@dataAreaId, @orderNumber, @vendorAccount, @vendorName, @status, @currencyCode,
             @requestedDeliveryDate, @createdDateTime, @modifiedAt, @rawJson, @syncedAt, @syncedAt, 0,
             @contentHash, @syncedAt);
        `);

      // Regels: vervang volledig (delete + insert) binnen dezelfde transactie.
      await new sql.Request(tx)
        .input('dataAreaId', sql.NVarChar(16), dataAreaId)
        .input('orderNumber', sql.NVarChar(64), orderNumber)
        .query('DELETE FROM dbo.po_cache_lines WHERE data_area_id = @dataAreaId AND order_number = @orderNumber');

      for (const line of lines) {
        const lineNumber = toNumberOrNull(line.lineNumber);
        if (lineNumber === null) continue;
        await new sql.Request(tx)
          .input('dataAreaId', sql.NVarChar(16), dataAreaId)
          .input('orderNumber', sql.NVarChar(64), orderNumber)
          .input('lineNumber', sql.Int, lineNumber)
          .input('itemNumber', sql.NVarChar(64), line.itemNumber || null)
          .input('description', sql.NVarChar(512), line.description || null)
          .input('quantity', sql.Decimal(18, 4), toNumberOrNull(line.quantity))
          .input('unit', sql.NVarChar(16), line.unit || null)
          .input('lineAmount', sql.Decimal(18, 4), toNumberOrNull(line.lineAmount))
          .input('currencyCode', sql.NVarChar(8), line.currencyCode || null)
          .input('requestedDeliveryDate', sql.DateTime2, toDateOrNull(line.requestedDeliveryDate))
          .input('rawJson', sql.NVarChar(sql.MAX), JSON.stringify(line.raw || {}))
          .input('syncedAt', sql.DateTime2, refreshStart)
          .query(`
            INSERT INTO dbo.po_cache_lines
              (data_area_id, order_number, line_number, item_number, description, quantity, unit,
               line_amount, currency_code, requested_delivery_date, raw_json, synced_at)
            VALUES
              (@dataAreaId, @orderNumber, @lineNumber, @itemNumber, @description, @quantity, @unit,
               @lineAmount, @currencyCode, @requestedDeliveryDate, @rawJson, @syncedAt);
          `);
      }

      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }
    }

    // Headers die deze full resync niet meer raakten = verdwenen in D365.
    await pool.request()
      .input('refreshStart', sql.DateTime2, refreshStart)
      .query(`
        UPDATE dbo.po_cache_headers
        SET removed_in_d365 = CASE WHEN synced_at < @refreshStart THEN 1 ELSE 0 END
      `);

    await pool.request()
      .input('watermark', sql.DateTime2, watermark)
      .input('syncedAt', sql.DateTime2, refreshStart)
      .query(`
        UPDATE dbo.po_sync_state
        SET watermark = @watermark, last_full_sync_at = @syncedAt, updated_at = SYSUTCDATETIME()
        WHERE id = 1
      `);

    logger.info('PO-cache ververst', { orders: items.length, truncated: result.truncated });
    invalidateReadCache();
    updateRefreshProgress({
      status: 'done',
      fetched: items.length,
      totalToFetch: refreshProgress.totalToFetch ?? items.length,
      sourceTotal: refreshProgress.sourceTotal ?? result.total ?? null,
      truncated: Boolean(result.truncated),
      finishedAt: new Date().toISOString(),
      error: null,
    });
    return { orders: items.length, truncated: Boolean(result.truncated), syncedAt: refreshStart.toISOString() };
  } catch (err) {
    updateRefreshProgress({
      status: 'error',
      finishedAt: new Date().toISOString(),
      error: err.message || 'D365-refresh opslaan mislukt',
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// read — bouw rijen uit po_cache_* + actieve kolommen + eigen waarden
// ---------------------------------------------------------------------------
async function read({ includeRemoved = false, userId = null } = {}) {
  const readScope = { includeRemoved, userId };
  const cachedPayload = getCachedReadPayload(readScope);
  if (cachedPayload) {
    return cachedPayload;
  }

  const pool = await getPool();
  const [headerCols, lineCols] = await Promise.all([
    listColumns({ level: 'header', includeInactive: false }),
    listColumns({ level: 'line', includeInactive: false }),
  ]);

  const lastViewedAt = await getLastViewedAt(userId);
  const lastViewedMs = lastViewedAt ? new Date(lastViewedAt).getTime() : null;

  const headersResult = await pool.request().query(`
    SELECT data_area_id, order_number, vendor_account, vendor_name, status, currency_code,
           requested_delivery_date, created_date_time, d365_modified_at, removed_in_d365,
           first_seen_at, content_changed_at
    FROM dbo.po_cache_headers
    ${includeRemoved ? '' : 'WHERE removed_in_d365 = 0'}
    ORDER BY order_number
  `);

  const linesResult = await pool.request().query(`
    SELECT data_area_id, order_number, line_number, item_number, description, quantity, unit,
           line_amount, currency_code, requested_delivery_date
    FROM dbo.po_cache_lines
    ORDER BY order_number, line_number
  `);

  const customResult = await pool.request().query(`
    SELECT cv.column_id, c.[key], c.[level], c.data_type, cv.data_area_id, cv.order_number,
           cv.line_number, cv.value_text, cv.value_number, cv.value_date
    FROM dbo.po_custom_values cv
    INNER JOIN dbo.po_columns c ON c.id = cv.column_id
    WHERE c.is_active = 1
  `);

  // Index custom-waarden op order/line.
  const customByCell = new Map(); // key: dataAreaId|orderNumber|lineNumber -> { colKey: value }
  for (const row of customResult.recordset) {
    const cellKey = `${row.data_area_id}|${row.order_number}|${row.line_number}`;
    let value = null;
    if (row.data_type === 'number') value = row.value_number !== null ? Number(row.value_number) : null;
    else if (row.data_type === 'date') value = row.value_date ? new Date(row.value_date).toISOString() : null;
    else if (row.data_type === 'boolean') value = row.value_number === null ? null : Boolean(row.value_number);
    else value = row.value_text;
    if (!customByCell.has(cellKey)) customByCell.set(cellKey, {});
    customByCell.get(cellKey)[row.key] = value;
  }

  // Index regels per order.
  const linesByOrder = new Map();
  for (const ln of linesResult.recordset) {
    const orderKey = `${ln.data_area_id}|${ln.order_number}`;
    if (!linesByOrder.has(orderKey)) linesByOrder.set(orderKey, []);
    linesByOrder.get(orderKey).push(ln);
  }

  function headerValues(h) {
    const values = {};
    for (const col of headerCols) {
      if (col.source === 'd365') {
        const field = HEADER_FIELD_BY_KEY[col.key];
        values[col.key] = field ? normalizeOut(h[field]) : null;
      }
    }
    const custom = customByCell.get(`${h.data_area_id}|${h.order_number}|${HEADER_LEVEL_LINE}`) || {};
    for (const col of headerCols) {
      if (col.source === 'custom') values[col.key] = col.key in custom ? custom[col.key] : null;
    }
    return values;
  }

  function lineValues(ln) {
    const values = {};
    for (const col of lineCols) {
      if (col.source === 'd365') {
        const field = LINE_FIELD_BY_KEY[col.key];
        values[col.key] = field ? normalizeOut(ln[field]) : null;
      }
    }
    const custom = customByCell.get(`${ln.data_area_id}|${ln.order_number}|${ln.line_number}`) || {};
    for (const col of lineCols) {
      if (col.source === 'custom') values[col.key] = col.key in custom ? custom[col.key] : null;
    }
    return values;
  }

  let newCount = 0;
  let changedCount = 0;
  const orders = headersResult.recordset.map((h) => {
    const orderKey = `${h.data_area_id}|${h.order_number}`;
    const lines = (linesByOrder.get(orderKey) || []).map((ln) => ({
      lineNumber: ln.line_number,
      values: lineValues(ln),
    }));

    // Nieuw/gewijzigd t.o.v. het laatste bezoek van deze gebruiker. Eerste bezoek
    // (geen last_viewed_at) → niets highlighten, zodat het scherm niet vol vlaggen staat.
    const firstSeenMs = h.first_seen_at ? new Date(h.first_seen_at).getTime() : null;
    const changedMs = h.content_changed_at ? new Date(h.content_changed_at).getTime() : null;
    const isNew = lastViewedMs !== null && firstSeenMs !== null && firstSeenMs > lastViewedMs;
    const isChanged = !isNew && lastViewedMs !== null && changedMs !== null && changedMs > lastViewedMs;
    if (isNew) newCount += 1;
    else if (isChanged) changedCount += 1;

    return {
      dataAreaId: h.data_area_id,
      orderNumber: h.order_number,
      removedInD365: Boolean(h.removed_in_d365),
      isNew,
      isChanged,
      values: headerValues(h),
      lines,
      lineCount: lines.length,
    };
  });

  const { lastFullSyncAt } = await getSyncState();
  const staleThresholdMinutes = await getStaleThresholdMinutes();
  const stale = !lastFullSyncAt
    || (Date.now() - new Date(lastFullSyncAt).getTime() > staleThresholdMinutes * 60 * 1000);

  const payload = {
    syncedAt: lastFullSyncAt ? new Date(lastFullSyncAt).toISOString() : null,
    stale,
    hasCache: Boolean(lastFullSyncAt),
    staleThresholdMinutes,
    columns: { header: headerCols, line: lineCols },
    orders,
    total: orders.length,
    lastViewedAt: lastViewedAt ? new Date(lastViewedAt).toISOString() : null,
    newCount,
    changedCount,
  };

  setCachedReadPayload(readScope, payload);
  return payload;
}

function normalizeOut(value) {
  if (value instanceof Date) return value.toISOString();
  return value === undefined ? null : value;
}

// ---------------------------------------------------------------------------
// Nieuw-detectie per gebruiker: laatst-bekeken-watermerk (#133)
// ---------------------------------------------------------------------------
async function getLastViewedAt(userId) {
  if (!userId) return null;
  const pool = await getPool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query('SELECT last_viewed_at FROM dbo.po_user_view_state WHERE user_id = @userId');
  return result.recordset.length ? result.recordset[0].last_viewed_at : null;
}

async function markViewed(userId) {
  if (!userId) {
    throw Object.assign(new Error('Geen gebruiker'), { status: 401 });
  }
  const pool = await getPool();
  await pool.request()
    .input('userId', sql.Int, userId)
    .query(`
      MERGE dbo.po_user_view_state AS target
      USING (SELECT @userId AS user_id) AS src ON target.user_id = src.user_id
      WHEN MATCHED THEN UPDATE SET last_viewed_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (user_id, last_viewed_at) VALUES (@userId, SYSUTCDATETIME());
    `);
  invalidateReadCache({ userId });
  return { success: true };
}

// ---------------------------------------------------------------------------
// saveCustomValue — instant SQL-write van een eigen kolomwaarde
// ---------------------------------------------------------------------------
async function saveCustomValue({ columnId, dataAreaId, orderNumber, lineNumber, value }, userId) {
  const column = await getColumnById(columnId);
  if (!column || !column.isActive) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  if (column.source !== 'custom') {
    throw Object.assign(new Error('Alleen eigen kolommen zijn bewerkbaar'), { status: 400 });
  }

  const area = String(dataAreaId || '').trim();
  const order = String(orderNumber || '').trim();
  if (!area || !order) {
    throw Object.assign(new Error('dataAreaId en orderNumber zijn verplicht'), { status: 400 });
  }
  if (area.length > 16 || order.length > 64) {
    throw Object.assign(new Error('dataAreaId of orderNumber is te lang'), { status: 400 });
  }

  // Header-niveau → sentinel -1; line-niveau → echt regelnummer (verplicht).
  let resolvedLine = HEADER_LEVEL_LINE;
  if (column.level === 'line') {
    const ln = toNumberOrNull(lineNumber);
    if (ln === null) {
      throw Object.assign(new Error('lineNumber is verplicht voor een regel-kolom'), { status: 400 });
    }
    resolvedLine = ln;
  }

  // Typecoercie volgens data_type (geen alles-in-NVARCHAR).
  let valueText = null;
  let valueNumber = null;
  let valueDate = null;
  const empty = value === null || value === undefined || value === '';

  if (!empty) {
    if (column.dataType === 'number') {
      valueNumber = toNumberOrNull(value);
      if (valueNumber === null) throw Object.assign(new Error('Waarde moet een getal zijn'), { status: 400 });
    } else if (column.dataType === 'date') {
      valueDate = toDateOrNull(value);
      if (valueDate === null) throw Object.assign(new Error('Waarde moet een datum zijn'), { status: 400 });
    } else if (column.dataType === 'boolean') {
      valueNumber = value === true || value === 'true' || value === 1 || value === '1' ? 1 : 0;
    } else if (column.dataType === 'select') {
      const allowed = Array.isArray(column.options) ? column.options : [];
      const str = String(value);
      if (allowed.length && !allowed.includes(str)) {
        throw Object.assign(new Error('Waarde valt buiten de keuzelijst'), { status: 400 });
      }
      valueText = str;
    } else {
      valueText = String(value);
    }
  }

  const pool = await getPool();
  // Waarde opslaan (primair) + de oude/nieuwe waarde vastleggen in een table-variable.
  // OUTPUT ... INTO mag NIET rechtstreeks naar po_cell_history: MSSQL verbiedt een OUTPUT-doel
  // met een foreign key of CHECK-constraint. Daarom vangen we de wijziging op in @changes en
  // schrijven we de historie daarna weg (best-effort — zie onder).
  const result = await pool.request()
    .input('columnId', sql.BigInt, columnId)
    .input('dataAreaId', sql.NVarChar(16), area)
    .input('orderNumber', sql.NVarChar(64), order)
    .input('lineNumber', sql.Int, resolvedLine)
    .input('valueText', sql.NVarChar(sql.MAX), valueText)
    .input('valueNumber', sql.Decimal(38, 10), valueNumber)
    .input('valueDate', sql.DateTime2, valueDate)
    .input('userId', sql.Int, userId || null)
    .query(`
      DECLARE @changes TABLE (
        action NVARCHAR(16),
        old_value_text NVARCHAR(MAX), old_value_number DECIMAL(38,10), old_value_date DATETIME2,
        new_value_text NVARCHAR(MAX), new_value_number DECIMAL(38,10), new_value_date DATETIME2
      );
      MERGE dbo.po_custom_values AS target
      USING (SELECT @columnId AS column_id, @dataAreaId AS data_area_id,
                    @orderNumber AS order_number, @lineNumber AS line_number) AS src
        ON target.column_id = src.column_id AND target.data_area_id = src.data_area_id
           AND target.order_number = src.order_number AND target.line_number = src.line_number
      WHEN MATCHED THEN UPDATE SET
        value_text = @valueText, value_number = @valueNumber, value_date = @valueDate,
        updated_by = @userId, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT
        (column_id, data_area_id, order_number, line_number, value_text, value_number, value_date, updated_by)
        VALUES (@columnId, @dataAreaId, @orderNumber, @lineNumber, @valueText, @valueNumber, @valueDate, @userId)
      OUTPUT
        CASE
          WHEN $action = 'INSERT' THEN 'insert'
          WHEN @valueText IS NULL AND @valueNumber IS NULL AND @valueDate IS NULL THEN 'clear'
          ELSE 'update'
        END,
        deleted.value_text, deleted.value_number, deleted.value_date,   -- oude waarde (NULL bij insert)
        inserted.value_text, inserted.value_number, inserted.value_date -- nieuwe waarde
      INTO @changes (action, old_value_text, old_value_number, old_value_date,
                     new_value_text, new_value_number, new_value_date);
      SELECT action, old_value_text, old_value_number, old_value_date,
             new_value_text, new_value_number, new_value_date FROM @changes;
    `);

  // Cel-geschiedenis (audit trail) best-effort wegschrijven. De waarde is nu al opgeslagen;
  // een fout hier (bv. tabel nog niet gemigreerd) mag de opslag nooit laten mislukken.
  const change = result.recordset && result.recordset[0];
  if (change) {
    try {
      await pool.request()
        .input('columnId', sql.BigInt, columnId)
        .input('dataAreaId', sql.NVarChar(16), area)
        .input('orderNumber', sql.NVarChar(64), order)
        .input('lineNumber', sql.Int, resolvedLine)
        .input('action', sql.NVarChar(16), change.action)
        .input('oldText', sql.NVarChar(sql.MAX), change.old_value_text)
        .input('oldNumber', sql.Decimal(38, 10), change.old_value_number)
        .input('oldDate', sql.DateTime2, change.old_value_date)
        .input('newText', sql.NVarChar(sql.MAX), change.new_value_text)
        .input('newNumber', sql.Decimal(38, 10), change.new_value_number)
        .input('newDate', sql.DateTime2, change.new_value_date)
        .input('userId', sql.Int, userId || null)
        .query(`
          INSERT INTO dbo.po_cell_history
            (column_id, data_area_id, order_number, line_number, action,
             old_value_text, old_value_number, old_value_date,
             new_value_text, new_value_number, new_value_date, changed_by)
          VALUES (@columnId, @dataAreaId, @orderNumber, @lineNumber, @action,
             @oldText, @oldNumber, @oldDate, @newText, @newNumber, @newDate, @userId);
        `);
    } catch (histErr) {
      logger.warn('Cel-geschiedenis wegschrijven mislukt (waarde zelf is opgeslagen)', { error: histErr.message });
    }
  }

  invalidateReadCache();
  return { columnId, dataAreaId: area, orderNumber: order, lineNumber: resolvedLine, value: empty ? null : value };
}

// ---------------------------------------------------------------------------
// correctField — D365-veldcorrectie terugschrijven (#133 write-back, Fase 3)
// Alleen voor D365-kolommen die admin als writable_to_d365 markeerde. Audit + status
// in po_field_corrections; optimistic concurrency via writeBackField (If-Match + waarde-check).
// ---------------------------------------------------------------------------
async function correctField({ columnId, dataAreaId, orderNumber, lineNumber, value, basedOnValue }, userId) {
  const column = await getColumnById(columnId);
  if (!column || !column.isActive) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  if (column.source !== 'd365' || !column.writableToD365 || !column.d365Field) {
    throw Object.assign(new Error('Deze kolom is niet ingesteld voor write-back naar D365'), { status: 400 });
  }

  const area = String(dataAreaId || '').trim();
  const order = String(orderNumber || '').trim();
  if (!area || !order) {
    throw Object.assign(new Error('dataAreaId en orderNumber zijn verplicht'), { status: 400 });
  }

  let resolvedLine = HEADER_LEVEL_LINE;
  if (column.level === 'line') {
    const ln = toNumberOrNull(lineNumber);
    if (ln === null) throw Object.assign(new Error('lineNumber is verplicht voor een regel-kolom'), { status: 400 });
    resolvedLine = ln;
  }

  // Typecoercie volgens data_type.
  let newValue;
  if (column.dataType === 'number') newValue = toNumberOrNull(value);
  else if (column.dataType === 'date') { const d = toDateOrNull(value); newValue = d ? d.toISOString() : null; }
  else if (column.dataType === 'boolean') newValue = value === true || value === 'true' || value === 1 || value === '1';
  else newValue = value === null || value === undefined ? null : String(value);

  const pool = await getPool();
  // 1) Audit: pending
  const ins = await pool.request()
    .input('columnId', sql.BigInt, columnId)
    .input('area', sql.NVarChar(16), area)
    .input('order', sql.NVarChar(64), order)
    .input('line', sql.Int, resolvedLine)
    .input('field', sql.NVarChar(128), column.d365Field)
    .input('old', sql.NVarChar(sql.MAX), basedOnValue === null || basedOnValue === undefined ? null : String(basedOnValue))
    .input('new', sql.NVarChar(sql.MAX), newValue === null || newValue === undefined ? null : String(newValue))
    .input('by', sql.Int, userId || null)
    .query(`
      INSERT INTO dbo.po_field_corrections
        (column_id, data_area_id, order_number, line_number, d365_field, old_value, new_value, status, created_by)
      OUTPUT INSERTED.id
      VALUES (@columnId, @area, @order, @line, @field, @old, @new, 'pending', @by);
    `);
  const correctionId = ins.recordset[0].id;

  // 2) Terugschrijven naar D365
  try {
    await writeBackField({
      level: column.level, dataAreaId: area, orderNumber: order, lineNumber: resolvedLine,
      d365Field: column.d365Field, newValue, basedOnValue, dataType: column.dataType,
    });
  } catch (err) {
    await pool.request()
      .input('id', sql.BigInt, correctionId)
      .input('err', sql.NVarChar(sql.MAX), err.message || 'Onbekende fout')
      .query("UPDATE dbo.po_field_corrections SET status = 'failed', error = @err WHERE id = @id");
    throw err;
  }

  // 3) Applied + cache bijwerken (best-effort; volgende refresh corrigeert hoe dan ook)
  await pool.request()
    .input('id', sql.BigInt, correctionId)
    .query("UPDATE dbo.po_field_corrections SET status = 'applied', applied_at = SYSUTCDATETIME() WHERE id = @id");

  const dbCol = column.level === 'line' ? LINE_FIELD_BY_KEY[column.key] : HEADER_FIELD_BY_KEY[column.key];
  if (dbCol) {
    const table = column.level === 'line' ? 'po_cache_lines' : 'po_cache_headers';
    const whereLine = column.level === 'line' ? ' AND line_number = @line' : '';
    try {
      const req = pool.request()
        .input('area', sql.NVarChar(16), area)
        .input('order', sql.NVarChar(64), order)
        .input('val', sql.NVarChar(sql.MAX), newValue === null || newValue === undefined ? null : String(newValue));
      if (column.level === 'line') req.input('line', sql.Int, resolvedLine);
      // dbCol komt uit onze interne mapping (geen user-input) → veilig in de query.
      await req.query(`UPDATE dbo.${table} SET ${dbCol} = @val WHERE data_area_id = @area AND order_number = @order${whereLine}`);
    } catch (cacheErr) {
      logger.warn('Cache-update na write-back mislukt (wordt bij volgende refresh hersteld)', { error: cacheErr.message });
    }
  }

  invalidateReadCache();
  return { success: true, correctionId, value: newValue };
}

// ---------------------------------------------------------------------------
// Cel-geschiedenis (audit trail) — leeslaag
// ---------------------------------------------------------------------------

// Kiest uit een getypeerd triplet de eerste niet-lege waarde; datums → yyyy-mm-dd.
function pickTypedValue({ text, number, date }) {
  if (date !== null && date !== undefined) {
    const d = date instanceof Date ? date : new Date(date);
    return Number.isNaN(d.getTime()) ? String(date) : d.toISOString().slice(0, 10);
  }
  if (number !== null && number !== undefined) return Number(number);
  if (text !== null && text !== undefined) return text;
  return null;
}

// Normaliseert één historie-rij (uit po_cell_history óf po_field_corrections) naar de API-vorm.
function formatHistoryRow(row) {
  return {
    source: row.source,                       // 'custom' | 'writeback'
    action: row.action,                       // 'insert' | 'update' | 'clear' | 'correct'
    at: row.at instanceof Date ? row.at.toISOString() : row.at,
    oldValue: pickTypedValue({ text: row.old_value_text, number: row.old_value_number, date: row.old_value_date }),
    newValue: pickTypedValue({ text: row.new_value_text, number: row.new_value_number, date: row.new_value_date }),
    status: row.status || null,               // alleen write-back (pending/applied/failed)
    reason: row.change_reason || null,
    user: (row.user_name || row.user_email)
      ? { name: row.user_name || null, email: row.user_email || null }
      : null,
  };
}

// getCellHistory — verenigde, chronologische tijdlijn voor één cel:
// eigen-kolom-edits (po_cell_history) + D365-veldcorrecties (po_field_corrections).
async function getCellHistory({ columnId, dataAreaId, orderNumber, lineNumber }) {
  const column = await getColumnById(columnId);
  if (!column || !column.isActive) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }

  const area = String(dataAreaId || '').trim();
  const order = String(orderNumber || '').trim();
  if (!area || !order) {
    throw Object.assign(new Error('dataAreaId en orderNumber zijn verplicht'), { status: 400 });
  }
  if (area.length > 16 || order.length > 64) {
    throw Object.assign(new Error('dataAreaId of orderNumber is te lang'), { status: 400 });
  }

  let resolvedLine = HEADER_LEVEL_LINE;
  if (column.level === 'line') {
    const ln = toNumberOrNull(lineNumber);
    if (ln === null) throw Object.assign(new Error('lineNumber is verplicht voor een regel-kolom'), { status: 400 });
    resolvedLine = ln;
  }

  const pool = await getPool();
  const result = await pool.request()
    .input('columnId', sql.BigInt, columnId)
    .input('area', sql.NVarChar(16), area)
    .input('order', sql.NVarChar(64), order)
    .input('line', sql.Int, resolvedLine)
    .query(`
      SELECT 'custom' AS source, h.action, h.changed_at AS at,
             h.old_value_text, h.old_value_number, h.old_value_date,
             h.new_value_text, h.new_value_number, h.new_value_date,
             CAST(NULL AS NVARCHAR(16)) AS status, h.change_reason,
             u.email AS user_email, u.display_name AS user_name
      FROM dbo.po_cell_history h
      LEFT JOIN dbo.users u ON u.id = h.changed_by
      WHERE h.column_id = @columnId AND h.data_area_id = @area
        AND h.order_number = @order AND h.line_number = @line
      UNION ALL
      SELECT 'writeback' AS source, 'correct' AS action, c.created_at AS at,
             c.old_value AS old_value_text, CAST(NULL AS DECIMAL(38,10)) AS old_value_number, CAST(NULL AS DATETIME2) AS old_value_date,
             c.new_value AS new_value_text, CAST(NULL AS DECIMAL(38,10)) AS new_value_number, CAST(NULL AS DATETIME2) AS new_value_date,
             c.status, CAST(NULL AS NVARCHAR(512)) AS change_reason,
             u2.email AS user_email, u2.display_name AS user_name
      FROM dbo.po_field_corrections c
      LEFT JOIN dbo.users u2 ON u2.id = c.created_by
      WHERE c.column_id = @columnId AND c.data_area_id = @area
        AND c.order_number = @order AND c.line_number = @line
      ORDER BY at DESC;
    `);

  return result.recordset.map(formatHistoryRow);
}

module.exports = {
  refresh,
  read,
  getCacheStats,
  getFilterFieldCatalogAndPreview,
  saveCustomValue,
  correctField,
  getCellHistory,
  formatHistoryRow,
  getSyncState,
  isStale,
  getStaleThresholdMinutes,
  getRefreshProgress,
  getLastViewedAt,
  markViewed,
  computeOrderHash,
};
