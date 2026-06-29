'use strict';

// SQL-cache voor D365 Purchase Orders + merge met de kolomregistry en eigen kolomwaarden.
// Fase 1 (#AB:132): lezen gaat altijd uit SQL; D365 wordt alleen geraadpleegd bij refresh.
// Write-back (po_field_corrections) volgt in Fase 3; per-user nieuw-detectie in Fase 2.

const sql = require('mssql');
const { logger } = require('../utils/logger');
const settingsService = require('./SettingsService');
const { fetchPurchaseOrders } = require('./D365ODataService');
const { listColumns, getColumnById } = require('./PurchaseOrderColumnsService');

const DEFAULT_STALE_MINUTES = 15;
const HEADER_LEVEL_LINE = -1; // sentinel: header-niveau custom-waarde

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

async function isStale() {
  const { lastFullSyncAt } = await getSyncState();
  if (!lastFullSyncAt) return true;
  const thresholdMs = (await getStaleThresholdMinutes()) * 60 * 1000;
  return Date.now() - new Date(lastFullSyncAt).getTime() > thresholdMs;
}

// ---------------------------------------------------------------------------
// refresh — volledige resync vanuit D365 naar po_cache_headers/lines
// ---------------------------------------------------------------------------
async function refresh() {
  const company = (await settingsService.getAsync('D365_ODATA_COMPANY', '')).trim();
  const refreshStart = new Date();

  const result = await fetchPurchaseOrders({ supplierAccount: null, fetchAll: true });
  const items = Array.isArray(result.items) ? result.items : [];
  const pool = await getPool();
  let watermark = null;

  for (const order of items) {
    const raw = order.raw || {};
    const dataAreaId = String(raw.dataAreaId || company || '').trim();
    const orderNumber = String(order.orderNumber || raw.PurchaseOrderNumber || '').trim();
    if (!dataAreaId || !orderNumber) continue;

    const modifiedAt = toDateOrNull(raw.ModifiedDateTime);
    if (modifiedAt && (!watermark || modifiedAt > watermark)) watermark = modifiedAt;

    const lines = Array.isArray(order.lines) ? order.lines : [];

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
        .query(`
          MERGE dbo.po_cache_headers AS target
          USING (SELECT @dataAreaId AS data_area_id, @orderNumber AS order_number) AS src
            ON target.data_area_id = src.data_area_id AND target.order_number = src.order_number
          WHEN MATCHED THEN UPDATE SET
            vendor_account = @vendorAccount, vendor_name = @vendorName, status = @status,
            currency_code = @currencyCode, requested_delivery_date = @requestedDeliveryDate,
            created_date_time = @createdDateTime, d365_modified_at = @modifiedAt,
            raw_json = @rawJson, synced_at = @syncedAt, removed_in_d365 = 0
          WHEN NOT MATCHED THEN INSERT
            (data_area_id, order_number, vendor_account, vendor_name, status, currency_code,
             requested_delivery_date, created_date_time, d365_modified_at, raw_json, synced_at, first_seen_at, removed_in_d365)
            VALUES (@dataAreaId, @orderNumber, @vendorAccount, @vendorName, @status, @currencyCode,
             @requestedDeliveryDate, @createdDateTime, @modifiedAt, @rawJson, @syncedAt, @syncedAt, 0);
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
  return { orders: items.length, truncated: Boolean(result.truncated), syncedAt: refreshStart.toISOString() };
}

// ---------------------------------------------------------------------------
// read — bouw rijen uit po_cache_* + actieve kolommen + eigen waarden
// ---------------------------------------------------------------------------
async function read({ includeRemoved = false } = {}) {
  const pool = await getPool();
  const [headerCols, lineCols] = await Promise.all([
    listColumns({ level: 'header', includeInactive: false }),
    listColumns({ level: 'line', includeInactive: false }),
  ]);

  const headersResult = await pool.request().query(`
    SELECT data_area_id, order_number, vendor_account, vendor_name, status, currency_code,
           requested_delivery_date, created_date_time, d365_modified_at, removed_in_d365
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

  const orders = headersResult.recordset.map((h) => {
    const orderKey = `${h.data_area_id}|${h.order_number}`;
    const lines = (linesByOrder.get(orderKey) || []).map((ln) => ({
      lineNumber: ln.line_number,
      values: lineValues(ln),
    }));
    return {
      dataAreaId: h.data_area_id,
      orderNumber: h.order_number,
      removedInD365: Boolean(h.removed_in_d365),
      values: headerValues(h),
      lines,
      lineCount: lines.length,
    };
  });

  const { lastFullSyncAt } = await getSyncState();
  const staleThresholdMinutes = await getStaleThresholdMinutes();
  const stale = !lastFullSyncAt
    || (Date.now() - new Date(lastFullSyncAt).getTime() > staleThresholdMinutes * 60 * 1000);

  return {
    syncedAt: lastFullSyncAt ? new Date(lastFullSyncAt).toISOString() : null,
    stale,
    hasCache: Boolean(lastFullSyncAt),
    staleThresholdMinutes,
    columns: { header: headerCols, line: lineCols },
    orders,
    total: orders.length,
  };
}

function normalizeOut(value) {
  if (value instanceof Date) return value.toISOString();
  return value === undefined ? null : value;
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
  await pool.request()
    .input('columnId', sql.BigInt, columnId)
    .input('dataAreaId', sql.NVarChar(16), area)
    .input('orderNumber', sql.NVarChar(64), order)
    .input('lineNumber', sql.Int, resolvedLine)
    .input('valueText', sql.NVarChar(sql.MAX), valueText)
    .input('valueNumber', sql.Decimal(38, 10), valueNumber)
    .input('valueDate', sql.DateTime2, valueDate)
    .input('userId', sql.Int, userId || null)
    .query(`
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
        VALUES (@columnId, @dataAreaId, @orderNumber, @lineNumber, @valueText, @valueNumber, @valueDate, @userId);
    `);

  return { columnId, dataAreaId: area, orderNumber: order, lineNumber: resolvedLine, value: empty ? null : value };
}

module.exports = {
  refresh,
  read,
  saveCustomValue,
  getSyncState,
  isStale,
  getStaleThresholdMinutes,
};
