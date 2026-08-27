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
  isSentinelDate,
} = require('./rccpPoRow');

function compareIsoWeek(aYear, aWeek, bYear, bWeek) {
  if (aYear !== bYear) return aYear - bYear;
  return aWeek - bWeek;
}

function emptyWeekBucket() {
  return new Map();
}

function lineItemNumber(lineValues, masterValues) {
  return String(pickValue(lineValues, 'itemNumber') ?? pickValue(masterValues, 'itemNumber') ?? '').trim();
}

function resolveDataAreaId(row, masterValues) {
  const fromRow = String(row?.partitionKey || row?.dataAreaId || '').trim();
  if (fromRow) return fromRow;
  return String(pickValue(masterValues, 'dataAreaId') || '').trim();
}

function bump(weekMap, week, itemNumber, status, qty, late = false, dataAreaId = '') {
  if (!(qty > 0) || !week) return;
  let itemMap = weekMap.get(week);
  if (!itemMap) {
    itemMap = emptyWeekBucket();
    weekMap.set(week, itemMap);
  }
  const current = itemMap.get(itemNumber) || {
    open: 0, received: 0, late: false, dataAreaId: '',
  };
  if (!current.dataAreaId && dataAreaId) current.dataAreaId = dataAreaId;
  if (status === 'open') {
    current.open += qty;
    current.late = current.late || Boolean(late);
  } else {
    current.received += qty;
  }
  itemMap.set(itemNumber, current);
}

function emitSegment(itemNumber, qty, status, late, dataAreaId) {
  return {
    itemNumber, qty, status, late, dataAreaId: dataAreaId || '',
  };
}

function emitAbove(itemMap) {
  const items = [...itemMap.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const out = [];
  for (const itemNumber of items) {
    const entry = itemMap.get(itemNumber);
    if (entry.received > 0) {
      out.push(emitSegment(itemNumber, entry.received, 'received', false, entry.dataAreaId));
    }
    if (entry.open > 0) {
      out.push(emitSegment(itemNumber, entry.open, 'open', Boolean(entry.late), entry.dataAreaId));
    }
  }
  return out;
}

function emitBelow(itemMap) {
  const items = [...itemMap.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const out = [];
  for (const itemNumber of items) {
    const entry = itemMap.get(itemNumber);
    if (entry.received > 0) {
      out.push(emitSegment(itemNumber, entry.received, 'received', false, entry.dataAreaId));
    }
  }
  return out;
}

function emitConfirmed(itemMap) {
  const items = [...itemMap.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const out = [];
  for (const itemNumber of items) {
    const entry = itemMap.get(itemNumber);
    if (entry.open > 0) {
      out.push(emitSegment(itemNumber, entry.open, 'confirmed', false, entry.dataAreaId));
    }
  }
  return out;
}

function spreadHeaderQty(weekMap, slots, masterValues, status, total, lateForSlot, dataAreaId) {
  if (!(total > 0) || !slots.length) return;
  const shareQty = total / slots.length;
  for (const slot of slots) {
    const late = typeof lateForSlot === 'function' ? lateForSlot(slot) : false;
    bump(
      weekMap,
      slot.key,
      lineItemNumber(slot.lineValues, masterValues),
      status,
      shareQty,
      late,
      dataAreaId,
    );
  }
}

/**
 * @param {object[]} rows PO-snapshot
 * @param {object} config RCCP-config
 * @param {{ fromYear: number, fromWeek: number, toYear: number, toWeek: number }} window
 * @param {{ now: Date, vendorAccount?: string|null }} options
 * @returns {Map<string, { segmentsAbove: object[], segmentsBelow: object[], segmentsConfirmed: object[] }>}
 */
function buildPoSegments(rows, config, window, { now, vendorAccount } = {}) {
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
      spreadHeaderQty(
        confirmed,
        confirmedSlots,
        masterValues,
        'open',
        toNumber(pickValue(masterValues, openKey)),
        false,
        dataAreaId,
      );
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
  return byWeek;
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
  buildPoSegments,
  mergeSegmentsIntoChart,
};
