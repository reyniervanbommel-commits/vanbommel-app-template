'use strict';

/**
 * RCCP dashboard KPI's binnen vendor + ISO-weekvenster.
 * Puur: geen Date.now, geen service-imports.
 */

const { getIsoWeek, getIsoWeekYear, isIsoWeekInWindow } = require('./isoWeek');
const {
  toNumber,
  pickValue,
  resolveLineMeasureQty,
  isHeaderOnlyMeasure,
  lineDateValue,
  collectDateSlots,
} = require('./rccpPoRow');

function compareIsoWeek(aYear, aWeek, bYear, bWeek) {
  if (aYear !== bYear) return aYear - bYear;
  return aWeek - bWeek;
}

function utcDayValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function calendarDaysBetween(later, earlier) {
  const a = utcDayValue(later);
  const b = utcDayValue(earlier);
  if (a === null || b === null) return null;
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function percentOf(part, whole) {
  if (!(whole > 0)) return 0;
  return (part / whole) * 100;
}

function addSku(set, itemNumber) {
  const sku = String(itemNumber || '').trim();
  if (sku) set.add(sku);
}

function visitUniverseLine(acc, line, nowYear, nowWeek) {
  acc.totalOpen += line.openQty;
  acc.totalDelivered += line.deliveredQty;
  const itemNumber = line.itemNumber;
  if (line.deliveredQty > 0 && line.receiptDate && line.plannedDate) {
    const days = calendarDaysBetween(line.receiptDate, line.plannedDate);
    if (days > 0) {
      acc.lateDeliveryDays.push(days);
      addSku(acc.lateDeliverySkus, itemNumber);
    }
  }
  if (
    line.openQty > 0
    && nowYear
    && nowWeek
    && compareIsoWeek(line.plannedYear, line.plannedWeek, nowYear, nowWeek) < 0
  ) {
    const openDays = calendarDaysBetween(acc.now, line.plannedDate);
    if (openDays !== null && openDays > 0) {
      acc.openLateDays.push(openDays);
      addSku(acc.openLateSkus, itemNumber);
    }
  }
}

function emptyAcc(now) {
  return {
    now,
    totalOpen: 0,
    totalDelivered: 0,
    lateDeliveryDays: [],
    lateDeliverySkus: new Set(),
    openLateDays: [],
    openLateSkus: new Set(),
  };
}

/**
 * @param {object[]} rows
 * @param {object} config
 * @param {{ fromYear: number, fromWeek: number, toYear: number, toWeek: number }} window
 * @param {{ now: Date, vendorAccount?: string|null }} options
 */
function buildRccpPoKpis(rows, config, window, { now, vendorAccount } = {}) {
  const openKey = String(config.openMeasureKey || '').trim();
  const deliveredKey = String(config.deliveredMeasureKey || '').trim();
  const dateKey = config.dateColumnKey;
  const receiptKey = String(config.receiptDateColumnKey || '').trim();
  const vendorCol = config.vendorColumnKey;
  const excludedSet = new Set((config.excludedStatuses || []).map((s) => String(s).toLowerCase()));
  const nowYear = getIsoWeekYear(now);
  const nowWeek = getIsoWeek(now);
  const acc = emptyAcc(now);

  for (const row of rows || []) {
    const masterValues = row.values || {};
    const vendor = String(pickValue(masterValues, vendorCol) || '').trim();
    if (!vendor) continue;
    if (vendorAccount && vendor !== vendorAccount) continue;

    const masterStatus = pickValue(masterValues, 'status') ?? pickValue(masterValues, 'purchaseOrderStatus');
    const details = (Array.isArray(row.details) ? row.details : []).filter((d) => !d.isRemoved);
    const headerOnlyOpen = Boolean(openKey && isHeaderOnlyMeasure(details, masterValues, openKey));
    const headerOnlyDelivered = Boolean(deliveredKey && isHeaderOnlyMeasure(details, masterValues, deliveredKey));
    const lineOpen = Boolean(openKey && !headerOnlyOpen);
    const lineDelivered = Boolean(deliveredKey && !headerOnlyDelivered);

    const pushIfInWindow = (lineValues, openQty, deliveredQty) => {
      const status = pickValue(lineValues, 'status') ?? masterStatus;
      if (status && excludedSet.has(String(status).toLowerCase())) return;
      const plannedDate = lineDateValue(lineValues, masterValues, dateKey);
      if (!plannedDate) return;
      const plannedYear = getIsoWeekYear(plannedDate);
      const plannedWeek = getIsoWeek(plannedDate);
      if (!plannedYear || !plannedWeek || !isIsoWeekInWindow(plannedYear, plannedWeek, window)) return;
      const receiptDate = (receiptKey && lineDateValue(lineValues, masterValues, receiptKey)) || plannedDate;
      visitUniverseLine(acc, {
        itemNumber: pickValue(lineValues, 'itemNumber') ?? pickValue(masterValues, 'itemNumber'),
        openQty: Math.max(0, openQty),
        deliveredQty: Math.max(0, deliveredQty),
        plannedDate,
        receiptDate,
        plannedYear,
        plannedWeek,
      }, nowYear, nowWeek);
    };

    if (lineOpen || lineDelivered) {
      const sources = details.length ? details : [{ values: masterValues }];
      const share = details.length ? 1 / details.length : 1;
      for (const detail of sources) {
        const lineValues = detail.values || {};
        const openQty = lineOpen ? resolveLineMeasureQty(lineValues, masterValues, openKey, share) : 0;
        const deliveredQty = lineDelivered
          ? resolveLineMeasureQty(lineValues, masterValues, deliveredKey, share)
          : 0;
        pushIfInWindow(lineValues, openQty, deliveredQty);
      }
    }

    if (headerOnlyOpen || headerOnlyDelivered) {
      const plannedSlots = collectDateSlots(
        details, masterValues, dateKey, null, window, excludedSet, masterStatus,
      );
      if (plannedSlots.length) {
        const openShare = headerOnlyOpen
          ? toNumber(pickValue(masterValues, openKey)) / plannedSlots.length
          : 0;
        const deliveredShare = headerOnlyDelivered
          ? toNumber(pickValue(masterValues, deliveredKey)) / plannedSlots.length
          : 0;
        for (const slot of plannedSlots) {
          pushIfInWindow(
            slot.lineValues,
            headerOnlyOpen ? openShare : 0,
            headerOnlyDelivered ? deliveredShare : 0,
          );
        }
      }
    }
  }

  const totalOpen = acc.totalOpen;
  const totalDelivered = acc.totalDelivered;
  const totalOrdered = totalOpen + totalDelivered;
  return {
    totalOrdered,
    totalDelivered,
    totalOpen,
    deliveredPercent: percentOf(totalDelivered, totalOrdered),
    openPercent: percentOf(totalOpen, totalOrdered),
    lateDeliveryAvgDays: mean(acc.lateDeliveryDays),
    lateDeliveryItemCount: acc.lateDeliverySkus.size,
    openLateItemCount: acc.openLateSkus.size,
    openLateAvgDays: mean(acc.openLateDays),
  };
}

/**
 * Capaciteitstekort uit de chart-serie (open load vs capacity-lijn).
 * @param {object[]} chart
 * @param {object[]} measureRows
 * @param {string} capacityMeasureKey
 */
function buildRccpCapacityKpis(chart, measureRows, capacityMeasureKey) {
  const openKeys = (measureRows || [])
    .filter((row) => !row.isCapacity && !row.isOvercapacity && !row.isWarning && !row.isDelivered)
    .map((row) => row.measureKey);
  let capacityShortfall = 0;
  let overloadedWeeks = 0;
  for (const point of chart || []) {
    const capacity = Number(point[capacityMeasureKey] || 0);
    const load = openKeys.reduce((sum, key) => sum + Number(point[key] || 0), 0);
    if (load > capacity) {
      capacityShortfall += load - capacity;
      overloadedWeeks += 1;
    }
  }
  return { capacityShortfall, overloadedWeeks };
}

module.exports = {
  buildRccpPoKpis,
  buildRccpCapacityKpis,
  calendarDaysBetween,
};
