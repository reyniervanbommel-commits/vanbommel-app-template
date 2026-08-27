'use strict';

/**
 * Factory-confirmed delivery load for the RCCP extra matrix row.
 * Puur: geen Date.now, geen RccpAnalysisService-import, geen history-I/O.
 */

const { getIsoWeek, getIsoWeekYear, isIsoWeekInWindow } = require('./isoWeek');
const {
  toNumber,
  pickValue,
  resolveLineMeasureQty,
  isHeaderOnlyMeasure,
  lineDateValue,
  collectDateSlots,
  isSentinelDate,
} = require('./rccpPoRow');

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

function addFactoryLoad(map, vendor, year, week, qty, window) {
  if (!(qty > 0) || !vendor || !year || !week) return;
  if (!isIsoWeekInWindow(year, week, window)) return;
  const key = factoryCellKey(vendor, year, week);
  map.set(key, (map.get(key) || 0) + qty);
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
 */
function buildFactoryConfirmedByCell(rows, config, window, { vendorAccount } = {}) {
  const map = new Map();
  const confirmedKey = String(config.confirmedDateColumnKey || '').trim();
  const openKey = String(config.openMeasureKey || '').trim();
  if (!confirmedKey || !openKey) return map;

  const vendorCol = config.vendorColumnKey;
  const excludedSet = new Set((config.excludedStatuses || []).map((s) => String(s).toLowerCase()));

  for (const row of rows || []) {
    const masterValues = row.values || {};
    const vendor = String(pickValue(masterValues, vendorCol) || '').trim();
    if (!vendor) continue;
    if (vendorAccount && vendor !== vendorAccount) continue;

    const masterStatus = pickValue(masterValues, 'status') ?? pickValue(masterValues, 'purchaseOrderStatus');
    const details = (Array.isArray(row.details) ? row.details : []).filter((d) => !d.isRemoved);
    const headerOnlyOpen = Boolean(openKey && isHeaderOnlyMeasure(details, masterValues, openKey));
    const lineOpen = Boolean(openKey && !headerOnlyOpen);

    if (lineOpen) {
      const sources = details.length ? details : [{ values: masterValues }];
      const share = details.length ? 1 / details.length : 1;
      for (const detail of sources) {
        const lineValues = detail.values || {};
        const status = pickValue(lineValues, 'status') ?? masterStatus;
        if (status && excludedSet.has(String(status).toLowerCase())) continue;
        const confirmedDate = lineDateValue(lineValues, masterValues, confirmedKey);
        if (!confirmedDate || isSentinelDate(confirmedDate)) continue;
        const year = getIsoWeekYear(confirmedDate);
        const week = getIsoWeek(confirmedDate);
        const qty = resolveLineMeasureQty(lineValues, masterValues, openKey, share);
        addFactoryLoad(map, vendor, year, week, qty, window);
      }
    }

    if (headerOnlyOpen) {
      const slots = collectDateSlots(
        details, masterValues, confirmedKey, null, window, excludedSet, masterStatus,
      ).filter((slot) => !isSentinelDate(slot.dateValue));
      const total = toNumber(pickValue(masterValues, openKey));
      if (total > 0 && slots.length) {
        const shareQty = total / slots.length;
        for (const slot of slots) {
          addFactoryLoad(map, vendor, slot.year, slot.week, shareQty, window);
        }
      }
    }
  }

  return map;
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

module.exports = {
  CONFIRMED_DELIVERY_MEASURE_KEY,
  buildFactoryConfirmedByCell,
  buildConfirmedDeliveryCells,
  appendConfirmedDeliveryRow,
  matchConfirmedDeliveryDrill,
};
