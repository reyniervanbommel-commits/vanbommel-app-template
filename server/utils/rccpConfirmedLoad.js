'use strict';

/**
 * Requested/confirmed delivery load for the extra RCCP matrix rows.
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
const REQUESTED_DELIVERY_MEASURE_KEY = '__requested_delivery__';

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

function dateMeasureRow(measureKey, label, flagKey) {
  return {
    measureKey,
    label,
    showInChart: false,
    [flagKey]: true,
  };
}

function dateMatrixCell(vendor, period, qty, measureKey) {
  return {
    vendorAccount: vendor,
    periodYear: period.year,
    isoWeek: period.week,
    measureKey,
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

function collectVendors(qtyMap, vendorFilter) {
  const vendors = new Set();
  for (const key of qtyMap.keys()) {
    const vendor = parseFactoryCellKey(key).vendorAccount;
    if (!vendorFilter || vendor === vendorFilter) vendors.add(vendor);
  }
  if (vendorFilter) vendors.add(vendorFilter);
  return vendors;
}

function buildDateDeliveryCells({
  qtyMap, periods, vendorFilter, extraVendors = [], measureKey, label, flagKey, qtyFor,
} = {}) {
  const map = qtyMap || new Map();
  const vendors = collectVendors(map, vendorFilter);
  for (const vendor of extraVendors) {
    if (!vendorFilter || vendor === vendorFilter) vendors.add(vendor);
  }
  const cells = [];
  for (const vendor of vendors) {
    if (vendorFilter && vendor !== vendorFilter) continue;
    for (const period of periods || []) {
      cells.push(dateMatrixCell(vendor, period, qtyFor(map, vendor, period.year, period.week), measureKey));
    }
  }
  return { cells, measureRow: dateMeasureRow(measureKey, label, flagKey) };
}

function extraVendorsFromCells(cells) {
  const extraVendors = [];
  for (const cell of cells || []) {
    if (cell?.vendorAccount) extraVendors.push(cell.vendorAccount);
  }
  return extraVendors;
}

function appendDateDeliveryRow(cells, measureRows, options) {
  const extra = buildDateDeliveryCells({
    ...options,
    extraVendors: extraVendorsFromCells(cells),
  });
  cells.push(...extra.cells);
  measureRows.push(extra.measureRow);
  return extra;
}

function confirmedQtyFor(map, vendor, year, week) {
  return map.get(factoryCellKey(vendor, year, week)) || 0;
}

function requestedQtyFor(openMeasureKey) {
  const openKey = String(openMeasureKey || '').trim();
  return (map, vendor, year, week) => map.get(`${vendor}|${year}|${week}|${openKey}`) || 0;
}

function confirmedRowOptions(factoryConfirmedByCell, periods, vendorFilter, extraVendors) {
  return {
    qtyMap: factoryConfirmedByCell,
    periods,
    vendorFilter,
    extraVendors,
    measureKey: CONFIRMED_DELIVERY_MEASURE_KEY,
    label: 'Confirmed delivery',
    flagKey: 'isConfirmedDelivery',
    qtyFor: confirmedQtyFor,
  };
}

function buildConfirmedDeliveryCells({
  factoryConfirmedByCell, periods, vendorFilter, extraVendors = [],
} = {}) {
  return buildDateDeliveryCells(
    confirmedRowOptions(factoryConfirmedByCell, periods, vendorFilter, extraVendors),
  );
}

function appendConfirmedDeliveryRow({
  cells, measureRows, factoryConfirmedByCell, periods, vendorFilter,
} = {}) {
  return appendDateDeliveryRow(
    cells, measureRows, confirmedRowOptions(factoryConfirmedByCell, periods, vendorFilter),
  );
}

function appendRequestedDeliveryRow({
  cells, measureRows, confirmedByCell, openMeasureKey, periods, vendorFilter,
} = {}) {
  return appendDateDeliveryRow(cells, measureRows, {
    qtyMap: confirmedByCell,
    periods,
    vendorFilter,
    measureKey: REQUESTED_DELIVERY_MEASURE_KEY,
    label: 'Requested delivery',
    flagKey: 'isRequestedDelivery',
    qtyFor: requestedQtyFor(openMeasureKey),
  });
}

function matchDateDeliveryDrill(row, cell, config, window, dateColumnKey) {
  const result = [];
  const dateKey = String(dateColumnKey || '').trim();
  const openKey = String(config.openMeasureKey || '').trim();
  if (!dateKey || !openKey || !row || !cell) return result;

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
      details, masterValues, dateKey, null, window, excludedSet, masterStatus,
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
    const deliveryDate = lineDateValue(lineValues, masterValues, dateKey);
    if (!deliveryDate || isSentinelDate(deliveryDate)) return;
    const year = getIsoWeekYear(deliveryDate);
    const week = getIsoWeek(deliveryDate);
    if (year !== cell.periodYear || week !== cell.isoWeek) return;
    const qty = resolveLineMeasureQty(lineValues, masterValues, openKey, share);
    if (!(qty > 0)) return;
    result.push({
      orderNumber: row.recordKey,
      lineNumber,
      itemNumber: pickValue(lineValues, 'itemNumber') ?? pickValue(masterValues, 'itemNumber'),
      quantity: qty,
      deliveryDate,
      status: status || '',
      dateFromHeader: !pickValue(lineValues, dateKey),
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

function matchConfirmedDeliveryDrill(row, cell, config, window) {
  return matchDateDeliveryDrill(row, cell, config, window, config.confirmedDateColumnKey);
}

function matchRequestedDeliveryDrill(row, cell, config, window) {
  return matchDateDeliveryDrill(row, cell, config, window, config.dateColumnKey);
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
  REQUESTED_DELIVERY_MEASURE_KEY,
  buildFactoryConfirmedByCell,
  buildConfirmedDeliveryCells,
  appendConfirmedDeliveryRow,
  appendRequestedDeliveryRow,
  matchConfirmedDeliveryDrill,
  matchRequestedDeliveryDrill,
  openLoadForOvercapacity,
};
