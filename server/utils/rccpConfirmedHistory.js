'use strict';

/**
 * Batched confirmed-date history for one RCCP item.
 * Payload: { itemNumber, versions: [{ at, date }] }.
 */

const { getIsoWeek, getIsoWeekYear, isIsoWeekInWindow } = require('./isoWeek');
const {
  toNumber,
  pickValue,
  resolveLineMeasureQty,
  isHeaderOnlyMeasure,
  lineDateValue,
  isSentinelDate,
} = require('./rccpPoRow');

const PO_TABLE_KEY = 'purchase-orders';
const MASTER_DETAIL_KEY = -1;
const WILDCARDS = new Set(['*', '%', '_']);

function parseConfirmedHistoryItemNumber(raw) {
  const value = raw == null ? '' : String(raw).trim();
  if (!value || value.length > 128 || WILDCARDS.has(value)) {
    const err = new Error('itemNumber is required');
    err.status = 400;
    throw err;
  }
  return value;
}

function canonicalDateIso(value) {
  if (value === null || value === undefined || value === '') return null;
  if (isSentinelDate(value)) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function considerValue(map, at, value) {
  const date = canonicalDateIso(value);
  if (!date) return;
  const atIso = at instanceof Date ? at.toISOString() : String(at || '');
  const prev = map.get(date);
  if (!prev || atIso > prev.at) map.set(date, { at: atIso, date });
}

function collectConfirmedHistoryVersions(rows) {
  const map = new Map();
  for (const row of rows || []) {
    considerValue(map, row.at, row.newValue);
    considerValue(map, row.at, row.oldValue);
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function buildConfirmedHistoryBatch({ columnId, keys }) {
  const list = Array.isArray(keys) ? keys : [];
  if (!list.length) return null;
  const historyPred = list.map((_, index) => (
    `(h.partition_key = @p${index} AND h.record_key = @r${index} AND h.detail_key = @d${index})`
  )).join(' OR ');
  const corrPred = list.map((_, index) => (
    `(c.partition_key = @p${index} AND c.record_key = @r${index} AND c.detail_key = @d${index})`
  )).join(' OR ');
  const text = `
    SELECT h.changed_at AS at,
           h.old_value_text, h.old_value_number, h.old_value_date, h.old_value_bool,
           h.new_value_text, h.new_value_number, h.new_value_date, h.new_value_bool
    FROM dbo.tb_cell_history h
    WHERE h.column_id = @columnId AND (${historyPred})
    UNION ALL
    SELECT c.created_at AS at,
           c.old_value AS old_value_text, CAST(NULL AS DECIMAL(38,10)) AS old_value_number,
           CAST(NULL AS DATETIME2) AS old_value_date, CAST(NULL AS BIT) AS old_value_bool,
           c.new_value AS new_value_text, CAST(NULL AS DECIMAL(38,10)) AS new_value_number,
           CAST(NULL AS DATETIME2) AS new_value_date, CAST(NULL AS BIT) AS new_value_bool
    FROM dbo.tb_field_corrections c
    WHERE c.column_id = @columnId AND c.status = 'applied' AND (${corrPred})
  `;
  const inputs = [{ name: 'columnId', type: 'BigInt', value: columnId }];
  list.forEach((key, index) => {
    inputs.push({ name: `p${index}`, type: 'NVarChar', length: 32, value: String(key.partitionKey || '') });
    inputs.push({ name: `r${index}`, type: 'NVarChar', length: 128, value: String(key.recordKey || '') });
    const detail = Number(key.detailKey);
    inputs.push({
      name: `d${index}`,
      type: 'Int',
      value: Number.isFinite(detail) ? detail : MASTER_DETAIL_KEY,
    });
  });
  return { text, inputs };
}

function lineItemNumber(lineValues, masterValues) {
  return String(pickValue(lineValues, 'itemNumber') ?? pickValue(masterValues, 'itemNumber') ?? '').trim();
}

function collectConfirmedHistoryKeys({
  rows, config, window, vendorAccount, itemNumber, scope = 'detail',
}) {
  const keys = [];
  const seen = new Set();
  const sku = String(itemNumber || '').trim();
  const vendorCol = config?.vendorColumnKey;
  const dateKey = config?.dateColumnKey;
  const openKey = String(config?.openMeasureKey || '').trim();
  const excludedSet = new Set((config?.excludedStatuses || []).map((value) => String(value).toLowerCase()));
  const headerScope = scope === 'master';

  const push = (partitionKey, recordKey, detailKey) => {
    const part = String(partitionKey || '').trim();
    const record = String(recordKey || '').trim();
    const detail = headerScope || !Number.isFinite(Number(detailKey))
      ? MASTER_DETAIL_KEY
      : Number(detailKey);
    if (!part || !record) return;
    const id = `${part}|${record}|${detail}`;
    if (seen.has(id)) return;
    seen.add(id);
    keys.push({ partitionKey: part, recordKey: record, detailKey: detail });
  };

  for (const row of rows || []) {
    const masterValues = row.values || {};
    const vendor = String(pickValue(masterValues, vendorCol) || '').trim();
    if (!vendor || vendor !== vendorAccount) continue;
    const masterStatus = pickValue(masterValues, 'status') ?? pickValue(masterValues, 'purchaseOrderStatus');
    const details = (Array.isArray(row.details) ? row.details : []).filter((detail) => !detail.isRemoved);
    const headerOnly = Boolean(openKey && isHeaderOnlyMeasure(details, masterValues, openKey));
    const share = details.length ? 1 / details.length : 1;
    const sources = details.length
      ? details.map((detail) => ({ detailKey: detail.detailKey, lineValues: detail.values || {} }))
      : [{ detailKey: MASTER_DETAIL_KEY, lineValues: masterValues }];

    for (const source of sources) {
      const status = pickValue(source.lineValues, 'status') ?? masterStatus;
      if (status && excludedSet.has(String(status).toLowerCase())) continue;
      if (lineItemNumber(source.lineValues, masterValues) !== sku) continue;
      const openQty = headerOnly
        ? toNumber(pickValue(masterValues, openKey)) * share
        : resolveLineMeasureQty(source.lineValues, masterValues, openKey, share);
      if (!(openQty > 0)) continue;
      const planned = lineDateValue(source.lineValues, masterValues, dateKey);
      if (!planned) continue;
      const year = getIsoWeekYear(planned);
      const week = getIsoWeek(planned);
      if (!year || !week || !isIsoWeekInWindow(year, week, window)) continue;
      push(row.partitionKey, row.recordKey, source.detailKey);
    }
  }
  return keys;
}

function pickHistoryValue(row, side) {
  const prefix = side === 'old' ? 'old' : 'new';
  const number = row[`${prefix}_value_number`];
  const date = row[`${prefix}_value_date`];
  const bool = row[`${prefix}_value_bool`];
  const text = row[`${prefix}_value_text`];
  if (number !== null && number !== undefined) return Number(number);
  if (date !== null && date !== undefined) return date instanceof Date ? date.toISOString() : date;
  if (bool !== null && bool !== undefined) return Boolean(bool);
  return text === undefined ? null : text;
}

function sqlType(sql, input) {
  if (input.type === 'BigInt') return sql.BigInt;
  if (input.type === 'Int') return sql.Int;
  return sql.NVarChar(input.length || 128);
}

async function getConfirmedHistory({
  vendorAccount,
  supplierAccount = null,
  itemNumber,
  fromYear,
  fromWeek,
  toYear,
  toWeek,
}) {
  const { time } = require('../utils/timing');
  return time('rccp_confirmed_hist', async () => {
    const settingsService = require('../services/RccpSettingsService');
    const { readRccpPoRows } = require('../services/BoardSnapshotCache');
    const tableDataService = require('../services/TableDataService');
    const { getPool } = require('../services/TableRegistryService');
    const sql = require('mssql');

    const payload = (versions) => ({ itemNumber, versions });
    const config = await settingsService.getConfig();
    const confirmedKey = String(config.confirmedDateColumnKey || '').trim();
    if (!confirmedKey) return payload([]);

    const defs = await tableDataService.getBoardColumnDefinitions(PO_TABLE_KEY);
    const columns = [...(defs.master || []), ...(defs.detail || [])];
    const column = columns.find((col) => col.key === confirmedKey);
    if (!column?.id) return payload([]);

    const { rows: poRows } = await readRccpPoRows({
      tableKey: PO_TABLE_KEY,
      supplierAccount: supplierAccount || null,
    });
    const window = {
      fromYear: Number(fromYear),
      fromWeek: Number(fromWeek),
      toYear: Number(toYear),
      toWeek: Number(toWeek),
    };
    const keys = collectConfirmedHistoryKeys({
      rows: poRows,
      config,
      window,
      vendorAccount,
      itemNumber,
      scope: column.scope === 'master' ? 'master' : 'detail',
    });
    if (!keys.length) return payload([]);

    const batch = buildConfirmedHistoryBatch({ columnId: column.id, keys });
    const pool = await getPool();
    const request = pool.request();
    for (const input of batch.inputs) {
      request.input(input.name, sqlType(sql, input), input.value);
    }
    const result = await request.query(batch.text);
    const rows = (result.recordset || []).map((row) => ({
      at: row.at instanceof Date ? row.at.toISOString() : row.at,
      newValue: pickHistoryValue(row, 'new'),
      oldValue: pickHistoryValue(row, 'old'),
    }));
    return payload(collectConfirmedHistoryVersions(rows));
  });
}

module.exports = {
  parseConfirmedHistoryItemNumber,
  collectConfirmedHistoryVersions,
  buildConfirmedHistoryBatch,
  collectConfirmedHistoryKeys,
  getConfirmedHistory,
};
