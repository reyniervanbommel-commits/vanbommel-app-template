'use strict';

const { time } = require('../utils/timing');
const { readBoardSnapshot } = require('./BoardSnapshotCache');
const capacityService = require('./RccpCapacityService');
const settingsService = require('./RccpSettingsService');
const {
  getIsoWeek,
  getIsoWeekYear,
  isoWeekKey,
  isoWeekStartUtc,
  isoWeekEndUtc,
  buildWeekRange,
  differenceInIsoWeeks,
} = require('../utils/isoWeek');

const PO_TABLE_KEY = 'purchase-orders';

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function pickValue(values, key) {
  if (!values || !key) return null;
  const v = values[key];
  return v === undefined || v === null || v === '' ? null : v;
}

function isInWindow(year, week, window) {
  if (!year || !week) return false;
  const start = isoWeekStartUtc(window.fromYear, window.fromWeek).getTime();
  const end = isoWeekEndUtc(window.toYear, window.toWeek).getTime();
  const point = isoWeekStartUtc(year, week).getTime();
  return point >= start && point <= end;
}

function dateInWindow(value, window) {
  const year = getIsoWeekYear(value);
  const week = getIsoWeek(value);
  return isInWindow(year, week, window);
}

function resolveQty(lineValues, masterValues, key, share) {
  if (!key) return 0;
  const lineRaw = pickValue(lineValues, key);
  if (lineRaw !== null) return toNumber(lineRaw);
  return toNumber(pickValue(masterValues, key)) * share;
}

function mapPoLine({
  recordKey, masterValues, lineValues, lineNumber, share, config,
}) {
  const plannedDate = pickValue(lineValues, config.deliveryPlanPlannedDateKey)
    || pickValue(masterValues, config.deliveryPlanPlannedDateKey);
  if (!plannedDate) return null;

  const deliveredDateRaw = pickValue(lineValues, config.deliveryPlanDeliveredDateKey)
    || pickValue(masterValues, config.deliveryPlanDeliveredDateKey);
  const orderedQty = resolveQty(lineValues, masterValues, config.deliveryPlanOrderedQtyKey, share);
  const deliveredQtyRaw = deliveredDateRaw
    ? resolveQty(lineValues, masterValues, config.deliveryPlanDeliveredQtyKey, share)
    : 0;
  const delivered = Boolean(deliveredDateRaw) && deliveredQtyRaw > 0;
  const deliveredDate = delivered ? deliveredDateRaw : null;
  const deliveredQty = delivered ? deliveredQtyRaw : 0;
  const openQty = Math.max(0, orderedQty - deliveredQty);
  const purchaseOrderNumber = String(
    pickValue(masterValues, 'purchaseOrderNumber') || recordKey || '',
  ).trim();
  const line = lineNumber == null ? '' : String(lineNumber);
  return {
    orderId: `${purchaseOrderNumber}|${line}`,
    purchaseOrderNumber,
    lineNumber: line,
    orderedQty,
    deliveredQty,
    openQty,
    plannedDate,
    deliveredDate,
    delayWeeks: deliveredDate ? differenceInIsoWeeks(deliveredDate, plannedDate) : null,
  };
}

function mapSnapshotRows(rows, config, window, vendorAccount) {
  const excludedSet = new Set((config.excludedStatuses || []).map((s) => String(s).toLowerCase()));
  const orders = [];

  for (const row of rows) {
    const masterValues = row.values || {};
    const vendor = String(pickValue(masterValues, config.vendorColumnKey) || '').trim();
    if (!vendor || vendor !== vendorAccount) continue;

    const masterStatus = pickValue(masterValues, 'status') ?? pickValue(masterValues, 'purchaseOrderStatus');
    const details = (Array.isArray(row.details) ? row.details : []).filter((d) => !d.isRemoved);
    const share = details.length ? 1 / details.length : 1;

    const pushLine = (lineNumber, lineValues) => {
      const status = pickValue(lineValues, 'status') ?? masterStatus;
      if (status && excludedSet.has(String(status).toLowerCase())) return;
      const mapped = mapPoLine({
        recordKey: row.recordKey,
        masterValues,
        lineValues,
        lineNumber,
        share,
        config,
      });
      if (!mapped) return;
      const plannedIn = dateInWindow(mapped.plannedDate, window);
      const deliveredIn = mapped.deliveredDate ? dateInWindow(mapped.deliveredDate, window) : false;
      if (!plannedIn && !deliveredIn) return;
      orders.push(mapped);
    };

    if (!details.length) {
      pushLine('', masterValues);
      continue;
    }
    for (const detail of details) {
      pushLine(detail.detailKey ?? pickValue(detail.values, 'lineNumber') ?? '', detail.values || {});
    }
  }

  return orders;
}

function sumWeeklyCapacity(capacityRows, window) {
  const totals = new Map();
  for (const row of capacityRows) {
    const year = Number(row.periodYear);
    const week = Number(row.isoWeek);
    if (!isInWindow(year, week, window)) continue;
    const key = isoWeekKey(year, week);
    totals.set(key, (totals.get(key) || 0) + Number(row.availableQty || 0));
  }
  return Object.fromEntries(totals);
}

async function loadDeliveryPlan({
  vendorAccount = null,
  supplierAccount = null,
  fromYear,
  fromWeek,
  toYear,
  toWeek,
} = {}) {
  const effectiveVendor = String(supplierAccount || vendorAccount || '').trim();
  if (!effectiveVendor) {
    const err = new Error('vendorAccount is required');
    err.status = 400;
    throw err;
  }

  const config = await settingsService.getConfig();
  const window = {
    fromYear: Number(fromYear),
    fromWeek: Number(fromWeek),
    toYear: Number(toYear),
    toWeek: Number(toWeek),
  };

  const { rows: poRows } = await time('rccp_dp_po_read', () => readBoardSnapshot({
    tableKey: PO_TABLE_KEY,
    supplierAccount: supplierAccount || null,
  }));

  const orders = await time('rccp_dp_map', () => mapSnapshotRows(poRows, config, window, effectiveVendor));

  const capacityRows = await time('rccp_dp_capacity', () => capacityService.listCapacity({
    vendorAccount: effectiveVendor,
  }));

  const weeks = buildWeekRange(window.fromYear, window.fromWeek, window.toYear, window.toWeek);

  return {
    orders,
    weeks,
    weeklyCapacity: sumWeeklyCapacity(capacityRows, window),
    config: {
      deliveryPlanPlannedDateKey: config.deliveryPlanPlannedDateKey,
      deliveryPlanDeliveredDateKey: config.deliveryPlanDeliveredDateKey,
      deliveryPlanOrderedQtyKey: config.deliveryPlanOrderedQtyKey,
      deliveryPlanDeliveredQtyKey: config.deliveryPlanDeliveredQtyKey,
    },
    window,
    vendorAccount: effectiveVendor,
  };
}

module.exports = {
  loadDeliveryPlan,
  mapPoLine,
  mapSnapshotRows,
  sumWeeklyCapacity,
};
