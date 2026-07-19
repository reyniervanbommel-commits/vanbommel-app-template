'use strict';

const { time } = require('../utils/timing');
const tableDataService = require('./TableDataService');
const capacityService = require('./RccpCapacityService');
const settingsService = require('./RccpSettingsService');
const { CAPACITY_MEASURE_KEY } = require('./RccpSettingsService');
const { getIsoWeek, getIsoWeekYear, buildWeekRange, isoWeekStartUtc, isoWeekEndUtc } = require('../utils/isoWeek');
const { computeRccpStatus } = require('../utils/rccpStatus');

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

function cellKey(vendor, year, week, measureKey) {
  return `${vendor}|${year}|${week}|${measureKey}`;
}

function parseCellKey(key) {
  const [vendorAccount, periodYear, isoWeek, ...rest] = String(key).split('|');
  return {
    vendorAccount,
    periodYear: Number(periodYear),
    isoWeek: Number(isoWeek),
    measureKey: rest.join('|'),
  };
}

function aggregatePoLoad(rows, config, window) {
  const confirmedByCell = new Map();
  const missingDates = [];
  const measures = config.quantityMeasures || [];
  const excludedSet = new Set(config.excludedStatuses.map((s) => s.toLowerCase()));
  const diagnostics = {
    orderCount: rows.length,
    lineCount: 0,
    excludedLines: 0,
    missingVendorOrders: 0,
    missingDateLines: 0,
    outOfWindowLines: 0,
    zeroQuantityLines: 0,
    countedLines: 0,
    totalConfirmedQty: 0,
  };

  const addLoad = (vendor, year, week, measureKey, qty) => {
    if (qty <= 0) return;
    diagnostics.countedLines += 1;
    diagnostics.totalConfirmedQty += qty;
    const key = cellKey(vendor, year, week, measureKey);
    confirmedByCell.set(key, (confirmedByCell.get(key) || 0) + qty);
  };

  for (const row of rows) {
    const masterValues = row.values || {};
    const vendor = String(pickValue(masterValues, config.vendorColumnKey) || '').trim();
    if (!vendor) {
      diagnostics.missingVendorOrders += 1;
      continue;
    }

    const masterStatus = pickValue(masterValues, 'status') ?? pickValue(masterValues, 'purchaseOrderStatus');
    const details = (Array.isArray(row.details) ? row.details : []).filter((d) => !d.isRemoved);
    const masterQtyByMeasure = measures.map((m) => toNumber(pickValue(masterValues, m.columnKey)));

    const processLine = (lineNumber, lineValues, dateFromHeaderDefault) => {
      diagnostics.lineCount += 1;
      const share = details.length ? 1 / details.length : 1;
      // Een measure kan een regel-kolom zijn (eigen waarde per regel, bijv. quantity) of een
      // master-rollup (één totaal op de order, dat over de regels verdeeld moet worden).
      const measureQty = (measure, index) => {
        const lineRaw = pickValue(lineValues, measure.columnKey);
        return lineRaw !== null ? toNumber(lineRaw) : masterQtyByMeasure[index] * share;
      };

      const status = pickValue(lineValues, 'status') ?? masterStatus;
      if (status && excludedSet.has(String(status).toLowerCase())) {
        diagnostics.excludedLines += 1;
        return;
      }

      let dateValue = pickValue(lineValues, config.dateColumnKey);
      if (!dateValue) {
        dateValue = pickValue(masterValues, config.dateColumnKey);
      }
      if (!dateValue) {
        diagnostics.missingDateLines += 1;
        missingDates.push({
          orderNumber: row.recordKey,
          lineNumber,
          vendorAccount: vendor,
          quantity: measures.length ? measureQty(measures[0], 0) : 0,
          dateFromHeader: false,
        });
        return;
      }

      const year = getIsoWeekYear(dateValue);
      const week = getIsoWeek(dateValue);
      if (!year || !week) return;
      if (!isInWindow(year, week, window)) {
        diagnostics.outOfWindowLines += 1;
        return;
      }

      let hasQty = false;
      measures.forEach((measure, index) => {
        const qty = measureQty(measure, index);
        if (qty <= 0) return;
        hasQty = true;
        addLoad(vendor, year, week, measure.columnKey, qty);
      });
      if (!hasQty) diagnostics.zeroQuantityLines += 1;
    };

    if (!details.length) {
      processLine(null, masterValues, true);
      continue;
    }

    for (const detail of details) {
      processLine(detail.detailKey, detail.values || {}, false);
    }
  }

  return { confirmedByCell, missingDates, diagnostics };
}

function isInWindow(year, week, window) {
  const start = isoWeekStartUtc(window.fromYear, window.fromWeek).getTime();
  const end = isoWeekEndUtc(window.toYear, window.toWeek).getTime();
  const point = isoWeekStartUtc(year, week).getTime();
  return point >= start && point <= end;
}

function sumCapacityByVendorWeek(capacityRows, vendorFilter) {
  const totals = new Map();
  for (const row of capacityRows) {
    if (vendorFilter && row.vendorAccount !== vendorFilter) continue;
    const key = `${row.vendorAccount}|${row.periodYear}|${row.isoWeek}`;
    totals.set(key, (totals.get(key) || 0) + Number(row.availableQty || 0));
  }
  return totals;
}

function buildMatrixCells({
  capacityRows, confirmedByCell, config, window, vendorFilter = null,
}) {
  const measures = config.quantityMeasures || [];
  const capacityTotals = sumCapacityByVendorWeek(capacityRows, vendorFilter);
  const periods = buildWeekRange(window.fromYear, window.fromWeek, window.toYear, window.toWeek);
  const cells = [];

  const vendors = new Set();
  for (const key of confirmedByCell.keys()) vendors.add(parseCellKey(key).vendorAccount);
  for (const key of capacityTotals.keys()) vendors.add(key.split('|')[0]);

  for (const vendor of vendors) {
    if (vendorFilter && vendor !== vendorFilter) continue;

    for (const period of periods) {
      const capKey = `${vendor}|${period.year}|${period.week}`;
      const available = capacityTotals.get(capKey) || 0;

      for (const measure of measures) {
        const confirmed = confirmedByCell.get(cellKey(vendor, period.year, period.week, measure.columnKey)) || 0;
        const status = computeRccpStatus(available, confirmed, config.thresholds);
        cells.push({
          vendorAccount: vendor,
          periodYear: period.year,
          isoWeek: period.week,
          measureKey: measure.columnKey,
          availableQty: available,
          confirmedQty: confirmed,
          remainingQty: available - confirmed,
          utilPercent: status.utilPercent,
          statusColor: status.color,
          statusLabel: status.label,
        });
      }

      if (available > 0) {
        cells.push({
          vendorAccount: vendor,
          periodYear: period.year,
          isoWeek: period.week,
          measureKey: CAPACITY_MEASURE_KEY,
          availableQty: available,
          confirmedQty: 0,
          remainingQty: available,
          utilPercent: null,
          statusColor: 'green',
          statusLabel: 'OK',
        });
      }
    }
  }

  const measureRows = [
    ...measures.map((m) => ({
      measureKey: m.columnKey,
      label: m.label || m.columnKey,
      chartType: m.chartType,
      color: m.color,
      showInChart: m.showInChart !== false,
      isCapacity: false,
    })),
    {
      measureKey: CAPACITY_MEASURE_KEY,
      label: 'Available capacity',
      chartType: 'line',
      color: '#107C10',
      showInChart: true,
      isCapacity: true,
    },
  ];

  return { cells, measureRows, periods };
}

function buildKpis(cells, measures) {
  const loadKeys = new Set((measures || []).map((m) => m.columnKey));
  const loadCells = cells.filter((c) => loadKeys.has(c.measureKey));
  const totalAvailable = cells
    .filter((c) => c.measureKey === CAPACITY_MEASURE_KEY)
    .reduce((s, c) => s + c.availableQty, 0);
  const totalConfirmed = loadCells.reduce((s, c) => s + c.confirmedQty, 0);
  const overloaded = loadCells.filter((c) => c.statusLabel === 'Overloaded' || c.statusLabel === 'Unplanned').length;
  const warnings = loadCells.filter((c) => c.statusLabel === 'Warning').length;
  return { totalAvailable, totalConfirmed, overloaded, warnings };
}

function buildChartSeries(cells, periods, measureRows) {
  return periods.map(({ year, week, key }) => {
    const point = { key, year, week };
    for (const row of measureRows) {
      const slice = cells.filter(
        (c) => c.periodYear === year && c.isoWeek === week && c.measureKey === row.measureKey,
      );
      point[row.measureKey] = slice.reduce(
        (s, c) => s + (row.isCapacity ? c.availableQty : c.confirmedQty),
        0,
      );
    }
    return point;
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

  const { confirmedByCell, missingDates, diagnostics } = aggregatePoLoad(poData.rows || [], config, window);

  const capacityRows = await time('rccp_capacity', () => capacityService.listCapacity({
    vendorAccount: effectiveVendor,
    periodYear: window.fromYear,
    fromWeek: window.fromWeek,
    toWeek: window.toWeek,
  }));

  const { cells, measureRows, periods } = buildMatrixCells({
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
    measureRows,
    periods,
    missingDates: effectiveVendor
      ? missingDates.filter((m) => m.vendorAccount === effectiveVendor)
      : missingDates,
    diagnostics,
    kpis: buildKpis(cells, config.quantityMeasures),
    chart: buildChartSeries(cells, periods, measureRows),
  };
}

function buildDrillDownRows(rows, config, cell, window) {
  const result = [];
  const excludedSet = new Set(config.excludedStatuses.map((s) => s.toLowerCase()));
  const measureKey = cell.measureKey;
  if (!measureKey || measureKey === CAPACITY_MEASURE_KEY) return result;

  for (const row of rows) {
    const masterValues = row.values || {};
    const vendor = String(pickValue(masterValues, config.vendorColumnKey) || '').trim();
    if (vendor !== cell.vendorAccount) continue;

    const masterStatus = pickValue(masterValues, 'status') ?? pickValue(masterValues, 'purchaseOrderStatus');
    const details = (Array.isArray(row.details) ? row.details : []).filter((d) => !d.isRemoved);
    const masterQty = toNumber(pickValue(masterValues, measureKey));
    const share = details.length ? 1 / details.length : 1;

    const pushLine = (lineNumber, lineValues, dateValue, dateFromHeader) => {
      const status = pickValue(lineValues, 'status') ?? masterStatus;
      if (status && excludedSet.has(String(status).toLowerCase())) return;
      if (!dateValue) return;

      const year = getIsoWeekYear(dateValue);
      const week = getIsoWeek(dateValue);
      if (year !== cell.periodYear || week !== cell.isoWeek) return;
      if (!isInWindow(year, week, window)) return;

      const qty = masterQty * share;
      if (qty <= 0) return;

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
    measureKey: params.measureKey,
  };
  return {
    cell,
    rows: buildDrillDownRows(poData.rows || [], config, cell, window),
  };
}

function extractVendorsFromRows(rows, vendorColumnKey) {
  const vendors = new Set();
  for (const row of rows || []) {
    const vendor = String(pickValue(row.values, vendorColumnKey) || '').trim();
    if (vendor) vendors.add(vendor);
  }
  return [...vendors].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Maps each vendor value to the vendor name on its order rows. The vendor column is
 * configurable while vendorName is a fixed master field, so vendors without a name
 * are simply absent from the map and fall back to their code in the UI.
 */
function extractVendorNamesFromRows(rows, vendorColumnKey) {
  const names = {};
  for (const row of rows || []) {
    const vendor = String(pickValue(row.values, vendorColumnKey) || '').trim();
    if (!vendor || names[vendor]) continue;
    const name = String(pickValue(row.values, 'vendorName') || '').trim();
    if (name) names[vendor] = name;
  }
  return names;
}

async function listMainTableVendors({ supplierAccount = null } = {}) {
  const config = await settingsService.getConfig();
  const poData = await time('rccp_vendor_list', () => tableDataService.read({
    tableKey: PO_TABLE_KEY,
    supplierAccount: supplierAccount || null,
  }));
  return {
    vendorColumnKey: config.vendorColumnKey,
    vendors: extractVendorsFromRows(poData.rows, config.vendorColumnKey),
    vendorNames: extractVendorNamesFromRows(poData.rows, config.vendorColumnKey),
  };
}

module.exports = {
  aggregatePoLoad,
  buildMatrixCells,
  analyze,
  getDrillDown,
  listMainTableVendors,
  extractVendorsFromRows,
  extractVendorNamesFromRows,
  cellKey,
  parseCellKey,
};
