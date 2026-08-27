'use strict';

/**
 * Factory-confirmed delivery load for the RCCP extra matrix row.
 * Puur: geen Date.now, geen RccpAnalysisService-import, geen history-I/O.
 */

const { getIsoWeek, getIsoWeekYear } = require('./isoWeek');
const {
  toNumber,
  pickValue,
  resolveLineMeasureQty,
  isHeaderOnlyMeasure,
  lineDateValue,
  collectDateSlots,
  isSentinelDate,
} = require('./rccpPoRow');
const { buildPoSegmentState } = require('./rccpPoSegments');

const CONFIRMED_DELIVERY_MEASURE_KEY = '__confirmed_delivery__';

function factoryCellKey(vendor, year, week) {
  return `${vendor}|${year}|${week}`;
}

function parseFactoryCellKey(key) {
  const [vendorAccount, periodYear, isoWeek] = String(key).split('|');
  return {
    vendorAccount,
    periodYear: Number(periodYear),
    isoWeek: Number(isoWeek),
  };
}

function confirmedMeasureRow() {
  return {
    measureKey: CONFIRMED_DELIVERY_MEASURE_KEY,
    label: 'Confirmed delivery',
    showInChart: false,
    isConfirmedDelivery: true,
  };
}

function confirmedMatrixCell(vendor, period, qty) {
  return {
    vendorAccount: vendor,
    periodYear: period.year,
    isoWeek: period.week,
    measureKey: CONFIRMED_DELIVERY_MEASURE_KEY,
    availableQty: 0,
    confirmedQty: qty,
    remainingQty: 0,
    utilPercent: null,
    statusColor: 'grey',
    statusLabel: 'N/A',
  };
}

/**
 * Open qty keyed by vendor|year|week of the confirmed date.
 * Skips empty / sentinel dates and clips outside the window.
 * Same PO walk as chart segments.
 */
function buildFactoryConfirmedByCell(rows, config, window, { vendorAccount, now } = {}) {
  return buildPoSegmentState(rows, config, window, {
    now: now || new Date(0),
    vendorAccount,
  }).factoryConfirmedByCell;
}

function collectVendors(factoryConfirmedByCell, vendorFilter) {
  const vendors = new Set();
  for (const key of factoryConfirmedByCell.keys()) {
    const vendor = parseFactoryCellKey(key).vendorAccount;
    if (!vendorFilter || vendor === vendorFilter) vendors.add(vendor);
  }
  if (vendorFilter) vendors.add(vendorFilter);
  return vendors;
}

function buildConfirmedDeliveryCells({
  factoryConfirmedByCell, periods, vendorFilter, extraVendors = [],
} = {}) {
  const map = factoryConfirmedByCell || new Map();
  const vendors = collectVendors(map, vendorFilter);
  for (const vendor of extraVendors) {
    if (!vendorFilter || vendor === vendorFilter) vendors.add(vendor);
  }
  const cells = [];
  for (const vendor of vendors) {
    if (vendorFilter && vendor !== vendorFilter) continue;
    for (const period of periods || []) {
      const qty = map.get(factoryCellKey(vendor, period.year, period.week)) || 0;
      cells.push(confirmedMatrixCell(vendor, period, qty));
    }
  }
  return { cells, measureRow: confirmedMeasureRow() };
}

function appendConfirmedDeliveryRow({
  cells, measureRows, factoryConfirmedByCell, periods, vendorFilter,
} = {}) {
  const extraVendors = [];
  for (const cell of cells || []) {
    if (cell?.vendorAccount) extraVendors.push(cell.vendorAccount);
  }
  const extra = buildConfirmedDeliveryCells({
    factoryConfirmedByCell,
    periods,
    vendorFilter,
    extraVendors,
  });
  cells.push(...extra.cells);
  measureRows.push(extra.measureRow);
  return extra;
}

function matchConfirmedDeliveryDrill(row, cell, config, window) {
  const result = [];
  const confirmedKey = String(config.confirmedDateColumnKey || '').trim();
  const openKey = String(config.openMeasureKey || '').trim();
  if (!confirmedKey || !openKey || !row || !cell) return result;

  const masterValues = row.values || {};
  const vendor = String(pickValue(masterValues, config.vendorColumnKey) || '').trim();
  if (vendor !== cell.vendorAccount) return result;

  const excludedSet = new Set((config.excludedStatuses || []).map((s) => String(s).toLowerCase()));
  const masterStatus = pickValue(masterValues, 'status') ?? pickValue(masterValues, 'purchaseOrderStatus');
  const details = (Array.isArray(row.details) ? row.details : []).filter((d) => !d.isRemoved);
  const share = details.length ? 1 / details.length : 1;
  const headerOnlyOpen = Boolean(openKey && isHeaderOnlyMeasure(details, masterValues, openKey));

  if (headerOnlyOpen) {
    const slots = collectDateSlots(
      details, masterValues, confirmedKey, null, window, excludedSet, masterStatus,
    ).filter((slot) => !isSentinelDate(slot.dateValue));
    const total = toNumber(pickValue(masterValues, openKey));
    if (!(total > 0) || !slots.length) return result;
    const shareQty = total / slots.length;
    for (const slot of slots) {
      if (slot.year !== cell.periodYear || slot.week !== cell.isoWeek) continue;
      result.push({
        orderNumber: row.recordKey,
        lineNumber: slot.lineNumber,
        itemNumber: pickValue(slot.lineValues, 'itemNumber') ?? pickValue(masterValues, 'itemNumber'),
        quantity: shareQty,
        deliveryDate: slot.dateValue,
        status: (pickValue(slot.lineValues, 'status') ?? masterStatus) || '',
        dateFromHeader: slot.dateFromHeader,
      });
    }
    return result;
  }

  const pushLine = (lineNumber, lineValues) => {
    const status = pickValue(lineValues, 'status') ?? masterStatus;
    if (status && excludedSet.has(String(status).toLowerCase())) return;
    const confirmedDate = lineDateValue(lineValues, masterValues, confirmedKey);
    if (!confirmedDate || isSentinelDate(confirmedDate)) return;
    const year = getIsoWeekYear(confirmedDate);
    const week = getIsoWeek(confirmedDate);
    if (year !== cell.periodYear || week !== cell.isoWeek) return;
    const qty = resolveLineMeasureQty(lineValues, masterValues, openKey, share);
    if (!(qty > 0)) return;
    result.push({
      orderNumber: row.recordKey,
      lineNumber,
      itemNumber: pickValue(lineValues, 'itemNumber') ?? pickValue(masterValues, 'itemNumber'),
      quantity: qty,
      deliveryDate: confirmedDate,
      status: status || '',
      dateFromHeader: !pickValue(lineValues, confirmedKey),
    });
  };

  if (!details.length) {
    pushLine(null, masterValues);
    return result;
  }
  for (const detail of details) {
    pushLine(detail.detailKey, detail.values || {});
  }
  return result;
}

function openLoadForOvercapacity({
  planningDate,
  confirmedByCell,
  factoryConfirmedByCell,
  vendor,
  year,
  week,
  openMeasureKey,
} = {}) {
  if (planningDate === 'confirmed') {
    const map = factoryConfirmedByCell || new Map();
    return map.get(factoryCellKey(vendor, year, week)) || 0;
  }
  const map = confirmedByCell || new Map();
  return map.get(`${vendor}|${year}|${week}|${openMeasureKey}`) || 0;
}

module.exports = {
  CONFIRMED_DELIVERY_MEASURE_KEY,
  buildFactoryConfirmedByCell,
  buildConfirmedDeliveryCells,
  appendConfirmedDeliveryRow,
  matchConfirmedDeliveryDrill,
  openLoadForOvercapacity,
};
