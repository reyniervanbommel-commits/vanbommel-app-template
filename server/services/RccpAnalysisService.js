'use strict';

const { time } = require('../utils/timing');
const tableDataService = require('./TableDataService');
const capacityService = require('./RccpCapacityService');
const settingsService = require('./RccpSettingsService');
const { getIsoWeek, getIsoWeekYear, buildWeekRange, isoWeekStartUtc, isoWeekEndUtc } = require('../utils/isoWeek');
const { computeRccpStatus } = require('../utils/rccpStatus');

const UNCLASSIFIED = 'Unclassified';
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

function isExcludedStatus(status, excludedStatuses) {
  const normalized = String(status || '').trim().toLowerCase();
  return excludedStatuses.some((s) => normalized === String(s).trim().toLowerCase());
}

function cellKey(vendor, year, week, category) {
  return `${vendor}|${year}|${week}|${category}`;
}

function parseCellKey(key) {
  const [vendorAccount, periodYear, isoWeek, ...rest] = String(key).split('|');
  return {
    vendorAccount,
    periodYear: Number(periodYear),
    isoWeek: Number(isoWeek),
    capacityCategory: rest.join('|'),
  };
}

function aggregatePoLoad(rows, config, window) {
  const confirmedByCell = new Map();
  const missingDates = [];
  const excludedSet = new Set(config.excludedStatuses.map((s) => s.toLowerCase()));

  for (const row of rows) {
    const masterValues = row.values || {};
    const vendor = String(pickValue(masterValues, config.vendorColumnKey) || '').trim();
    if (!vendor) continue;

    const masterStatus = pickValue(masterValues, 'status') ?? pickValue(masterValues, 'purchaseOrderStatus');
    const details = Array.isArray(row.details) ? row.details : [];

    if (!details.length) {
      if (masterStatus && excludedSet.has(String(masterStatus).toLowerCase())) continue;
      const qty = toNumber(pickValue(masterValues, config.quantityColumnKey));
      const category = String(pickValue(masterValues, config.categoryColumnKey) || UNCLASSIFIED).trim() || UNCLASSIFIED;
      let dateValue = pickValue(masterValues, config.dateColumnKey);
      if (!dateValue) {
        missingDates.push({
          orderNumber: row.recordKey,
          lineNumber: null,
          vendorAccount: vendor,
          quantity: qty,
          dateFromHeader: true,
        });
        continue;
      }
      const year = getIsoWeekYear(dateValue);
      const week = getIsoWeek(dateValue);
      if (!year || !week) continue;
      if (!isInWindow(year, week, window)) continue;
      const key = cellKey(vendor, year, week, category);
      confirmedByCell.set(key, (confirmedByCell.get(key) || 0) + qty);
      continue;
    }

    for (const detail of details) {
      if (detail.isRemoved) continue;
      const lineValues = detail.values || {};
      const status = pickValue(lineValues, 'status') ?? masterStatus;
      if (status && excludedSet.has(String(status).toLowerCase())) continue;

      const qty = toNumber(pickValue(lineValues, config.quantityColumnKey) ?? pickValue(masterValues, config.quantityColumnKey));
      const category = String(
        pickValue(lineValues, config.categoryColumnKey) ?? pickValue(masterValues, config.categoryColumnKey) ?? UNCLASSIFIED,
      ).trim() || UNCLASSIFIED;

      let dateValue = pickValue(lineValues, config.dateColumnKey);
      let dateFromHeader = false;
      if (!dateValue) {
        dateValue = pickValue(masterValues, config.dateColumnKey);
        dateFromHeader = Boolean(dateValue);
      }
      if (!dateValue) {
        missingDates.push({
          orderNumber: row.recordKey,
          lineNumber: detail.detailKey,
          vendorAccount: vendor,
          quantity: qty,
          dateFromHeader: false,
        });
        continue;
      }

      const year = getIsoWeekYear(dateValue);
      const week = getIsoWeek(dateValue);
      if (!year || !week) continue;
      if (!isInWindow(year, week, window)) continue;

      const key = cellKey(vendor, year, week, category);
      confirmedByCell.set(key, (confirmedByCell.get(key) || 0) + qty);
    }
  }

  return { confirmedByCell, missingDates };
}

function isInWindow(year, week, window) {
  const start = isoWeekStartUtc(window.fromYear, window.fromWeek).getTime();
  const end = isoWeekEndUtc(window.toYear, window.toWeek).getTime();
  const point = isoWeekStartUtc(year, week).getTime();
  return point >= start && point <= end;
}

function buildMatrixCells({ capacityRows, confirmedByCell, config, window, vendorFilter = null }) {
  const capacityByKey = new Map();
  for (const row of capacityRows) {
    if (vendorFilter && row.vendorAccount !== vendorFilter) continue;
    capacityByKey.set(cellKey(row.vendorAccount, row.periodYear, row.isoWeek, row.capacityCategory), row);
  }

  const keys = new Set([...capacityByKey.keys(), ...confirmedByCell.keys()]);
  const cells = [];

  for (const key of keys) {
    const parts = parseCellKey(key);
    if (vendorFilter && parts.vendorAccount !== vendorFilter) continue;
    if (!isInWindow(parts.periodYear, parts.isoWeek, window)) continue;

    const capacity = capacityByKey.get(key);
    const available = capacity ? capacity.availableQty : 0;
    const confirmed = confirmedByCell.get(key) || 0;
    const remaining = available - confirmed;
    const status = computeRccpStatus(available, confirmed, config.thresholds);

    cells.push({
      ...parts,
      availableQty: available,
      confirmedQty: confirmed,
      remainingQty: remaining,
      utilPercent: status.utilPercent,
      statusColor: status.color,
      statusLabel: status.label,
      capacityId: capacity?.id ?? null,
    });
  }

  const categories = [...new Set(cells.map((c) => c.capacityCategory))].sort();
  const periods = buildWeekRange(window.fromYear, window.fromWeek, window.toYear, window.toWeek);

  return { cells, categories, periods };
}

function buildKpis(cells) {
  const totalAvailable = cells.reduce((s, c) => s + c.availableQty, 0);
  const totalConfirmed = cells.reduce((s, c) => s + c.confirmedQty, 0);
  const overloaded = cells.filter((c) => c.statusLabel === 'Overloaded' || c.statusLabel === 'Unplanned').length;
  const warnings = cells.filter((c) => c.statusLabel === 'Warning').length;
  return { totalAvailable, totalConfirmed, overloaded, warnings };
}

function buildChartSeries(cells, periods) {
  return periods.map(({ year, week, key }) => {
    const slice = cells.filter((c) => c.periodYear === year && c.isoWeek === week);
    return {
      key,
      year,
      week,
      available: slice.reduce((s, c) => s + c.availableQty, 0),
      confirmed: slice.reduce((s, c) => s + c.confirmedQty, 0),
    };
  });
}

async function analyze({
  vendorAccount = null,
  fromYear,
  fromWeek,
  toYear,
  toWeek,
  supplierAccount = null,
} = {}) {
  const config = await settingsService.getConfig();
  const effectiveVendor = supplierAccount || vendorAccount || null;
  const window = {
    fromYear: Number(fromYear),
    fromWeek: Number(fromWeek),
    toYear: Number(toYear),
    toWeek: Number(toWeek),
  };

  const poData = await time('rccp_po_read', () => tableDataService.read({
    tableKey: PO_TABLE_KEY,
    supplierAccount: supplierAccount || null,
  }));

  const { confirmedByCell, missingDates } = aggregatePoLoad(poData.rows || [], config, window);

  const capacityRows = await time('rccp_capacity', () => capacityService.listCapacity({
    vendorAccount: effectiveVendor,
    periodYear: window.fromYear,
    fromWeek: window.fromWeek,
    toWeek: window.toWeek,
  }));

  const { cells, categories, periods } = buildMatrixCells({
    capacityRows,
    confirmedByCell,
    config,
    window,
    vendorFilter: effectiveVendor,
  });

  return {
    config,
    window,
    vendorAccount: effectiveVendor,
    cells,
    categories,
    periods,
    missingDates: effectiveVendor
      ? missingDates.filter((m) => m.vendorAccount === effectiveVendor)
      : missingDates,
    kpis: buildKpis(cells),
    chart: buildChartSeries(cells, periods),
  };
}

function buildDrillDownRows(rows, config, cell, window) {
  const result = [];
  const excludedSet = new Set(config.excludedStatuses.map((s) => s.toLowerCase()));

  for (const row of rows) {
    const masterValues = row.values || {};
    const vendor = String(pickValue(masterValues, config.vendorColumnKey) || '').trim();
    if (vendor !== cell.vendorAccount) continue;

    const masterStatus = pickValue(masterValues, 'status') ?? pickValue(masterValues, 'purchaseOrderStatus');
    const details = Array.isArray(row.details) ? row.details : [];

    const pushLine = (lineNumber, lineValues, dateValue, dateFromHeader) => {
      const status = pickValue(lineValues, 'status') ?? masterStatus;
      if (status && excludedSet.has(String(status).toLowerCase())) return;

      const qty = toNumber(pickValue(lineValues, config.quantityColumnKey) ?? pickValue(masterValues, config.quantityColumnKey));
      const category = String(
        pickValue(lineValues, config.categoryColumnKey) ?? pickValue(masterValues, config.categoryColumnKey) ?? UNCLASSIFIED,
      ).trim() || UNCLASSIFIED;
      if (category !== cell.capacityCategory) return;
      if (!dateValue) return;

      const year = getIsoWeekYear(dateValue);
      const week = getIsoWeek(dateValue);
      if (year !== cell.periodYear || week !== cell.isoWeek) return;
      if (!isInWindow(year, week, window)) return;

      result.push({
        orderNumber: row.recordKey,
        lineNumber,
        itemNumber: pickValue(lineValues, 'itemNumber') ?? pickValue(masterValues, 'itemNumber'),
        quantity: qty,
        deliveryDate: dateValue,
        status: status || '',
        dateFromHeader,
      });
    };

    if (!details.length) {
      pushLine(null, masterValues, pickValue(masterValues, config.dateColumnKey), true);
      continue;
    }

    for (const detail of details) {
      if (detail.isRemoved) continue;
      const lineValues = detail.values || {};
      let dateValue = pickValue(lineValues, config.dateColumnKey);
      let dateFromHeader = false;
      if (!dateValue) {
        dateValue = pickValue(masterValues, config.dateColumnKey);
        dateFromHeader = Boolean(dateValue);
      }
      pushLine(detail.detailKey, lineValues, dateValue, dateFromHeader);
    }
  }

  return result;
}

async function getDrillDown(params) {
  const config = await settingsService.getConfig();
  const window = {
    fromYear: Number(params.fromYear),
    fromWeek: Number(params.fromWeek),
    toYear: Number(params.toYear),
    toWeek: Number(params.toWeek),
  };
  const poData = await tableDataService.read({
    tableKey: PO_TABLE_KEY,
    supplierAccount: params.supplierAccount || null,
  });
  const cell = {
    vendorAccount: params.vendorAccount,
    periodYear: Number(params.periodYear),
    isoWeek: Number(params.isoWeek),
    capacityCategory: params.capacityCategory,
  };
  return {
    cell,
    rows: buildDrillDownRows(poData.rows || [], config, cell, window),
  };
}

module.exports = {
  UNCLASSIFIED,
  aggregatePoLoad,
  buildMatrixCells,
  analyze,
  getDrillDown,
  cellKey,
  parseCellKey,
};
