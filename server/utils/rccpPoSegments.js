'use strict';

/**
 * PO-segmenten voor de RCCP Capacity vs load-grafiek.
 * Puur: geen Date.now, geen RccpAnalysisService-import.
 */

const { getIsoWeek, getIsoWeekYear, isoWeekKey, buildWeekRange } = require('./isoWeek');
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

function emptyWeekBucket() {
  return new Map();
}

function bump(weekMap, week, poNumber, status, qty, late = false) {
  if (!(qty > 0) || !week) return;
  let poMap = weekMap.get(week);
  if (!poMap) {
    poMap = emptyWeekBucket();
    weekMap.set(week, poMap);
  }
  const current = poMap.get(poNumber) || { open: 0, received: 0, late: false };
  if (status === 'open') {
    current.open += qty;
    current.late = current.late || Boolean(late);
  } else {
    current.received += qty;
  }
  poMap.set(poNumber, current);
}

function emitAbove(poMap) {
  const pos = [...poMap.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const out = [];
  for (const poNumber of pos) {
    const entry = poMap.get(poNumber);
    if (entry.received > 0) {
      out.push({
        poNumber, qty: entry.received, status: 'received', late: false,
      });
    }
    if (entry.open > 0) {
      out.push({
        poNumber, qty: entry.open, status: 'open', late: Boolean(entry.late),
      });
    }
  }
  return out;
}

function emitBelow(poMap) {
  const pos = [...poMap.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const out = [];
  for (const poNumber of pos) {
    const entry = poMap.get(poNumber);
    if (entry.received > 0) {
      out.push({
        poNumber, qty: entry.received, status: 'received', late: false,
      });
    }
  }
  return out;
}

function spreadHeaderQty(weekMap, slots, poNumber, status, total, lateForSlot) {
  if (!(total > 0) || !slots.length) return;
  const shareQty = total / slots.length;
  for (const slot of slots) {
    const late = typeof lateForSlot === 'function' ? lateForSlot(slot) : false;
    bump(weekMap, slot.key, poNumber, status, shareQty, late);
  }
}

/**
 * @param {object[]} rows PO-snapshot
 * @param {object} config RCCP-config
 * @param {{ fromYear: number, fromWeek: number, toYear: number, toWeek: number }} window
 * @param {{ now: Date, vendorAccount?: string|null }} options
 * @returns {Map<string, { segmentsAbove: object[], segmentsBelow: object[] }>}
 */
function buildPoSegments(rows, config, window, { now, vendorAccount } = {}) {
  const openKey = String(config.openMeasureKey || '').trim();
  const deliveredKey = String(config.deliveredMeasureKey || '').trim();
  const dateKey = config.dateColumnKey;
  const receiptKey = String(config.receiptDateColumnKey || '').trim();
  const vendorCol = config.vendorColumnKey;
  const excludedSet = new Set((config.excludedStatuses || []).map((s) => String(s).toLowerCase()));
  const nowYear = getIsoWeekYear(now);
  const nowWeek = getIsoWeek(now);
  const periods = buildWeekRange(window.fromYear, window.fromWeek, window.toYear, window.toWeek);
  const periodSet = new Set(periods.map((p) => p.key));

  const above = new Map();
  const below = new Map();

  const clipBump = (weekMap, week, poNumber, status, qty, late) => {
    if (!periodSet.has(week)) return;
    bump(weekMap, week, poNumber, status, qty, late);
  };

  for (const row of rows || []) {
    const masterValues = row.values || {};
    const vendor = String(pickValue(masterValues, vendorCol) || '').trim();
    if (!vendor) continue;
    if (vendorAccount && vendor !== vendorAccount) continue;

    const poNumber = row.recordKey;
    const masterStatus = pickValue(masterValues, 'status') ?? pickValue(masterValues, 'purchaseOrderStatus');
    const details = (Array.isArray(row.details) ? row.details : []).filter((d) => !d.isRemoved);
    const headerOnlyOpen = Boolean(openKey && isHeaderOnlyMeasure(details, masterValues, openKey));
    const headerOnlyDelivered = Boolean(deliveredKey && isHeaderOnlyMeasure(details, masterValues, deliveredKey));
    const lineOpen = Boolean(openKey && !headerOnlyOpen);
    const lineDelivered = Boolean(deliveredKey && !headerOnlyDelivered);

    const processLine = (lineValues) => {
      const status = pickValue(lineValues, 'status') ?? masterStatus;
      if (status && excludedSet.has(String(status).toLowerCase())) return;

      const plannedDate = lineDateValue(lineValues, masterValues, dateKey);
      const receiptDate = (receiptKey && lineDateValue(lineValues, masterValues, receiptKey)) || plannedDate;
      const share = details.length ? 1 / details.length : 1;
      const openQty = lineOpen ? resolveLineMeasureQty(lineValues, masterValues, openKey, share) : 0;
      const deliveredQty = lineDelivered
        ? resolveLineMeasureQty(lineValues, masterValues, deliveredKey, share)
        : 0;

      if (plannedDate) {
        const plannedYear = getIsoWeekYear(plannedDate);
        const plannedWeek = getIsoWeek(plannedDate);
        if (plannedYear && plannedWeek) {
          const plannedKey = isoWeekKey(plannedYear, plannedWeek);
          const late = Boolean(
            nowYear && nowWeek && compareIsoWeek(plannedYear, plannedWeek, nowYear, nowWeek) < 0,
          );
          clipBump(above, plannedKey, poNumber, 'received', deliveredQty, false);
          clipBump(above, plannedKey, poNumber, 'open', openQty, late);
        }
      }

      if (receiptDate && deliveredQty > 0) {
        const receiptYear = getIsoWeekYear(receiptDate);
        const receiptWeek = getIsoWeek(receiptDate);
        if (receiptYear && receiptWeek) {
          clipBump(below, isoWeekKey(receiptYear, receiptWeek), poNumber, 'received', deliveredQty, false);
        }
      }
    };

    if (lineOpen || lineDelivered) {
      if (!details.length) processLine(masterValues);
      else {
        for (const detail of details) processLine(detail.values || {});
      }
    }

    const plannedSlots = (headerOnlyOpen || headerOnlyDelivered)
      ? collectDateSlots(details, masterValues, dateKey, null, window, excludedSet, masterStatus)
      : [];
    if (headerOnlyOpen) {
      spreadHeaderQty(
        above,
        plannedSlots,
        poNumber,
        'open',
        toNumber(pickValue(masterValues, openKey)),
        (slot) => Boolean(nowYear && nowWeek && compareIsoWeek(slot.year, slot.week, nowYear, nowWeek) < 0),
      );
    }
    if (headerOnlyDelivered) {
      const deliveredTotal = toNumber(pickValue(masterValues, deliveredKey));
      spreadHeaderQty(above, plannedSlots, poNumber, 'received', deliveredTotal, false);
      const receiptSlots = collectDateSlots(
        details,
        masterValues,
        receiptKey || dateKey,
        receiptKey ? dateKey : null,
        window,
        excludedSet,
        masterStatus,
      );
      spreadHeaderQty(below, receiptSlots, poNumber, 'received', deliveredTotal, false);
    }
  }

  const byWeek = new Map();
  for (const period of periods) {
    byWeek.set(period.key, {
      segmentsAbove: emitAbove(above.get(period.key) || emptyWeekBucket()),
      segmentsBelow: emitBelow(below.get(period.key) || emptyWeekBucket()),
    });
  }
  return byWeek;
}

function mergeSegmentsIntoChart(chart, segmentsByWeek) {
  return (chart || []).map((point) => {
    const segs = segmentsByWeek.get(point.key) || { segmentsAbove: [], segmentsBelow: [] };
    return {
      ...point,
      segmentsAbove: segs.segmentsAbove,
      segmentsBelow: segs.segmentsBelow,
    };
  });
}

module.exports = {
  buildPoSegments,
  mergeSegmentsIntoChart,
};
