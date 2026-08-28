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
const { calendarDaysBetween } = require('./rccpKpis');

function compareIsoWeek(aYear, aWeek, bYear, bWeek) {
  if (aYear !== bYear) return aYear - bYear;
  return aWeek - bWeek;
}

function isSentinelDate(value) {
  if (value === null || value === undefined || value === '') return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCFullYear() <= 1900 || date.getFullYear() <= 1900;
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

function bump(weekMap, week, itemNumber, status, qty, late = false, dataAreaId = '', flags = {}) {
  if (!(qty > 0) || !week) return;
  let itemMap = weekMap.get(week);
  if (!itemMap) {
    itemMap = emptyWeekBucket();
    weekMap.set(week, itemMap);
  }
  const current = itemMap.get(itemNumber) || {
    open: 0, received: 0, late: false, receivedLate: false, receivedOnTime: false,
    planned1900: false, dataAreaId: '',
  };
  if (!current.dataAreaId && dataAreaId) current.dataAreaId = dataAreaId;
  current.planned1900 = current.planned1900 || Boolean(flags.planned1900);
  if (status === 'open') {
    current.open += qty;
    current.late = current.late || Boolean(late);
  } else {
    current.received += qty;
    current.receivedLate = current.receivedLate || Boolean(late);
    current.receivedOnTime = current.receivedOnTime || Boolean(flags.onTime);
  }
  itemMap.set(itemNumber, current);
}

function emitSegment(itemNumber, qty, status, late, dataAreaId, flags = {}) {
  return {
    itemNumber,
    qty,
    status,
    late: Boolean(late),
    onTime: Boolean(flags.onTime),
    planned1900: Boolean(flags.planned1900),
    dataAreaId: dataAreaId || '',
  };
}

function emitAbove(itemMap) {
  const items = [...itemMap.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const out = [];
  for (const itemNumber of items) {
    const entry = itemMap.get(itemNumber);
    const flags = { planned1900: entry.planned1900 };
    if (entry.received > 0) {
      out.push(emitSegment(itemNumber, entry.received, 'received', false, entry.dataAreaId, flags));
    }
    if (entry.open > 0) {
      out.push(emitSegment(itemNumber, entry.open, 'open', Boolean(entry.late), entry.dataAreaId, flags));
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
      out.push(emitSegment(
        itemNumber,
        entry.received,
        'received',
        Boolean(entry.receivedLate),
        entry.dataAreaId,
        { onTime: entry.receivedOnTime, planned1900: entry.planned1900 },
      ));
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

  const clipBump = (weekMap, week, itemNumber, status, qty, late, dataAreaId, flags) => {
    if (!periodSet.has(week)) return;
    bump(weekMap, week, itemNumber, status, qty, late, dataAreaId, flags);
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
      const rawReceipt = receiptKey ? lineDateValue(lineValues, masterValues, receiptKey) : null;
      const receiptDate = rawReceipt || plannedDate;
      const planned1900 = isSentinelDate(plannedDate);
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
          clipBump(above, plannedKey, itemNumber, 'received', deliveredQty, false, dataAreaId, { planned1900 });
          clipBump(above, plannedKey, itemNumber, 'open', openQty, late, dataAreaId, { planned1900 });
        }
      }

      if (receiptDate && deliveredQty > 0) {
        const receiptYear = getIsoWeekYear(receiptDate);
        const receiptWeek = getIsoWeek(receiptDate);
        if (receiptYear && receiptWeek) {
          const hasReceipt = Boolean(rawReceipt) && !isSentinelDate(rawReceipt);
          let receivedLate = false;
          let receivedOnTime = false;
          if (hasReceipt && plannedDate && !planned1900) {
            const days = calendarDaysBetween(receiptDate, plannedDate);
            receivedLate = days > 0;
            receivedOnTime = days !== null && days <= 0;
          }
          clipBump(
            below,
            isoWeekKey(receiptYear, receiptWeek),
            itemNumber,
            'received',
            deliveredQty,
            receivedLate,
            dataAreaId,
            { onTime: receivedOnTime, planned1900 },
          );
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
