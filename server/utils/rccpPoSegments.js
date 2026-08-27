'use strict';

/**
 * PO-segmenten voor de RCCP Capacity vs load-grafiek.
 * Puur: geen Date.now, geen RccpAnalysisService-import.
 */

const { getIsoWeek, getIsoWeekYear, isoWeekKey, buildWeekRange, isIsoWeekInWindow } = require('./isoWeek');
const {
  toNumber,
  pickValue,
  resolveLineMeasureQty,
  isHeaderOnlyMeasure,
  lineDateValue,
  collectDateSlots,
  isSentinelDate,
} = require('./rccpPoRow');
const {
  emptyWeekBucket,
  bump,
  emitAbove,
  emitBelow,
  emitConfirmed,
  spreadHeaderQty,
} = require('./rccpPoSegmentEmit');

function compareIsoWeek(aYear, aWeek, bYear, bWeek) {
  if (aYear !== bYear) return aYear - bYear;
  return aWeek - bWeek;
}

function lineItemNumber(lineValues, masterValues) {
  return String(pickValue(lineValues, 'itemNumber') ?? pickValue(masterValues, 'itemNumber') ?? '').trim();
}

function resolveDataAreaId(row, masterValues) {
  const fromRow = String(row?.partitionKey || row?.dataAreaId || '').trim();
  if (fromRow) return fromRow;
  return String(pickValue(masterValues, 'dataAreaId') || '').trim();
}

function addFactoryLoad(map, vendor, year, week, qty, window) {
  if (!(qty > 0) || !vendor || !year || !week) return;
  if (!isIsoWeekInWindow(year, week, window)) return;
  const key = `${vendor}|${year}|${week}`;
  map.set(key, (map.get(key) || 0) + qty);
}

/**
 * One PO walk: chart segments by week plus factory-confirmed open load.
 * @returns {{ byWeek: Map, factoryConfirmedByCell: Map }}
 */
function buildPoSegmentState(rows, config, window, { now, vendorAccount } = {}) {
  const openKey = String(config.openMeasureKey || '').trim();
  const deliveredKey = String(config.deliveredMeasureKey || '').trim();
  const dateKey = config.dateColumnKey;
  const receiptKey = String(config.receiptDateColumnKey || '').trim();
  const confirmedKey = String(config.confirmedDateColumnKey || '').trim();
  const vendorCol = config.vendorColumnKey;
  const excludedSet = new Set((config.excludedStatuses || []).map((s) => String(s).toLowerCase()));
  const nowYear = getIsoWeekYear(now);
  const nowWeek = getIsoWeek(now);
  const periods = buildWeekRange(window.fromYear, window.fromWeek, window.toYear, window.toWeek);
  const periodSet = new Set(periods.map((p) => p.key));

  const above = new Map();
  const below = new Map();
  const confirmed = new Map();
  const factoryConfirmedByCell = new Map();

  const clipBump = (weekMap, week, itemNumber, status, qty, late, dataAreaId) => {
    if (!periodSet.has(week)) return;
    bump(weekMap, week, itemNumber, status, qty, late, dataAreaId);
  };

  for (const row of rows || []) {
    const masterValues = row.values || {};
    const vendor = String(pickValue(masterValues, vendorCol) || '').trim();
    if (!vendor) continue;
    if (vendorAccount && vendor !== vendorAccount) continue;
    const dataAreaId = resolveDataAreaId(row, masterValues);

    const masterStatus = pickValue(masterValues, 'status') ?? pickValue(masterValues, 'purchaseOrderStatus');
    const details = (Array.isArray(row.details) ? row.details : []).filter((d) => !d.isRemoved);
    const headerOnlyOpen = Boolean(openKey && isHeaderOnlyMeasure(details, masterValues, openKey));
    const headerOnlyDelivered = Boolean(deliveredKey && isHeaderOnlyMeasure(details, masterValues, deliveredKey));
    const lineOpen = Boolean(openKey && !headerOnlyOpen);
    const lineDelivered = Boolean(deliveredKey && !headerOnlyDelivered);

    const processLine = (lineValues) => {
      const status = pickValue(lineValues, 'status') ?? masterStatus;
      if (status && excludedSet.has(String(status).toLowerCase())) return;

      const itemNumber = lineItemNumber(lineValues, masterValues);
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
          clipBump(above, plannedKey, itemNumber, 'received', deliveredQty, false, dataAreaId);
          clipBump(above, plannedKey, itemNumber, 'open', openQty, late, dataAreaId);
        }
      }

      if (receiptDate && deliveredQty > 0) {
        const receiptYear = getIsoWeekYear(receiptDate);
        const receiptWeek = getIsoWeek(receiptDate);
        if (receiptYear && receiptWeek) {
          clipBump(below, isoWeekKey(receiptYear, receiptWeek), itemNumber, 'received', deliveredQty, false, dataAreaId);
        }
      }

      if (confirmedKey && openQty > 0) {
        const confirmedDate = lineDateValue(lineValues, masterValues, confirmedKey);
        if (confirmedDate && !isSentinelDate(confirmedDate)) {
          const confirmedYear = getIsoWeekYear(confirmedDate);
          const confirmedWeek = getIsoWeek(confirmedDate);
          if (confirmedYear && confirmedWeek) {
            clipBump(confirmed, isoWeekKey(confirmedYear, confirmedWeek), itemNumber, 'open', openQty, false, dataAreaId);
            addFactoryLoad(factoryConfirmedByCell, vendor, confirmedYear, confirmedWeek, openQty, window);
          }
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
        masterValues,
        'open',
        toNumber(pickValue(masterValues, openKey)),
        (slot) => Boolean(nowYear && nowWeek && compareIsoWeek(slot.year, slot.week, nowYear, nowWeek) < 0),
        dataAreaId,
      );
    }
    if (headerOnlyDelivered) {
      const deliveredTotal = toNumber(pickValue(masterValues, deliveredKey));
      spreadHeaderQty(above, plannedSlots, masterValues, 'received', deliveredTotal, false, dataAreaId);
      const receiptSlots = collectDateSlots(
        details,
        masterValues,
        receiptKey || dateKey,
        receiptKey ? dateKey : null,
        window,
        excludedSet,
        masterStatus,
      );
      spreadHeaderQty(below, receiptSlots, masterValues, 'received', deliveredTotal, false, dataAreaId);
    }
    if (headerOnlyOpen && confirmedKey) {
      const confirmedSlots = collectDateSlots(
        details,
        masterValues,
        confirmedKey,
        null,
        window,
        excludedSet,
        masterStatus,
      ).filter((slot) => !isSentinelDate(slot.dateValue));
      const confirmedTotal = toNumber(pickValue(masterValues, openKey));
      spreadHeaderQty(
        confirmed,
        confirmedSlots,
        masterValues,
        'open',
        confirmedTotal,
        false,
        dataAreaId,
      );
      if (confirmedTotal > 0 && confirmedSlots.length) {
        const shareQty = confirmedTotal / confirmedSlots.length;
        for (const slot of confirmedSlots) {
          addFactoryLoad(factoryConfirmedByCell, vendor, slot.year, slot.week, shareQty, window);
        }
      }
    }
  }

  const byWeek = new Map();
  for (const period of periods) {
    byWeek.set(period.key, {
      segmentsAbove: emitAbove(above.get(period.key) || emptyWeekBucket()),
      segmentsBelow: emitBelow(below.get(period.key) || emptyWeekBucket()),
      segmentsConfirmed: emitConfirmed(confirmed.get(period.key) || emptyWeekBucket()),
    });
  }
  return { byWeek, factoryConfirmedByCell };
}

function buildPoSegments(rows, config, window, options) {
  return buildPoSegmentState(rows, config, window, options).byWeek;
}

function mergeSegmentsIntoChart(chart, segmentsByWeek) {
  return (chart || []).map((point) => {
    const segs = segmentsByWeek.get(point.key) || {
      segmentsAbove: [], segmentsBelow: [], segmentsConfirmed: [],
    };
    return {
      ...point,
      segmentsAbove: segs.segmentsAbove,
      segmentsBelow: segs.segmentsBelow,
      segmentsConfirmed: segs.segmentsConfirmed || [],
    };
  });
}

module.exports = {
  buildPoSegmentState,
  buildPoSegments,
  mergeSegmentsIntoChart,
};
