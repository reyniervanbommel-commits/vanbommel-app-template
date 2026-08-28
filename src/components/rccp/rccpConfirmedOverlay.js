import { monthBucketFromIsoWeek } from './rccpPeriodGrain';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function isoWeekKeyFromDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const year = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const startDay = yearStart.getUTCDay() || 7;
  yearStart.setUTCDate(yearStart.getUTCDate() + 4 - startDay);
  const week = 1 + Math.round((utc.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${pad2(week)}`;
}

function weekParts(weekKey) {
  const match = String(weekKey || '').match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) return null;
  return { year: Number(match[1]), week: Number(match[2]) };
}

function pointMatchesWeek(point, weekKey) {
  if (point?.key === weekKey) return true;
  const parts = weekParts(weekKey);
  if (!parts || !point?.month) return false;
  return monthBucketFromIsoWeek(parts.year, parts.week).key === point.key;
}

function isOpenSegment(segment) {
  return segment.status === 'open' || segment.status === 'confirmed';
}

function itemOpenQty(chart, itemNumber) {
  let confirmedOpen = 0;
  let sawConfirmed = false;
  let aboveOpen = 0;
  for (const point of chart || []) {
    for (const segment of point.segmentsConfirmed || []) {
      if (String(segment.itemNumber || '').trim() !== itemNumber) continue;
      sawConfirmed = true;
      if (isOpenSegment(segment)) confirmedOpen += Number(segment.qty) || 0;
    }
    for (const segment of point.segmentsAbove || []) {
      if (segment.status === 'open' && String(segment.itemNumber || '').trim() === itemNumber) {
        aboveOpen += Number(segment.qty) || 0;
      }
    }
  }
  return sawConfirmed ? confirmedOpen : aboveOpen;
}

function firstDataAreaId(chart, itemNumber) {
  for (const point of chart || []) {
    const segs = [
      ...(point.segmentsAbove || []),
      ...(point.segmentsConfirmed || []),
      ...(point.segmentsBelow || []),
    ];
    for (const segment of segs) {
      if (String(segment.itemNumber || '').trim() !== itemNumber) continue;
      const id = String(segment.dataAreaId || '').trim();
      if (id) return id;
    }
  }
  return '';
}

function qtyByWeekFromLines(lines, versions, totalQty) {
  const qtyByWeek = new Map();
  const source = Array.isArray(lines) && lines.length
    ? lines
    : [{ qty: totalQty, dates: (versions || []).map((version) => version.date) }];
  for (const line of source) {
    const qty = Number(line.qty) || 0;
    if (!(qty > 0)) continue;
    for (const date of line.dates || []) {
      const weekKey = isoWeekKeyFromDate(date);
      if (!weekKey) continue;
      qtyByWeek.set(weekKey, (qtyByWeek.get(weekKey) || 0) + qty);
    }
  }
  return qtyByWeek;
}

function replaceConfirmedSegments(chart, itemNumber, qtyByWeek, dataAreaId) {
  return (chart || []).map((point) => {
    const rest = (point.segmentsConfirmed || []).filter((segment) => {
      const same = String(segment.itemNumber || '').trim() === itemNumber;
      if (!same) return true;
      return segment.status === 'received';
    });
    let qty = 0;
    for (const [weekKey, weekQty] of qtyByWeek) {
      if (pointMatchesWeek(point, weekKey)) qty += weekQty;
    }
    if (!(qty > 0)) return { ...point, segmentsConfirmed: rest };
    return {
      ...point,
      segmentsConfirmed: [
        ...rest,
        {
          itemNumber, qty, status: 'open', late: false, dataAreaId,
        },
      ],
    };
  });
}

/**
 * Move confirmed-week open qty for one item onto chosen history week(s).
 * Received on that stack stays. Grain → item-filter → this overlay.
 */
export function overlayConfirmedHistory(chart, {
  itemNumber, selectedDate, versions = [], showAll = false, lines,
} = {}) {
  const sku = String(itemNumber || '').trim();
  if (!sku || !chart) return chart;
  if (!showAll && !selectedDate) return chart;
  const totalQty = itemOpenQty(chart, sku);
  const dataAreaId = firstDataAreaId(chart, sku);
  const qtyByWeek = showAll
    ? qtyByWeekFromLines(lines, versions, totalQty)
    : (() => {
      const weekKey = isoWeekKeyFromDate(selectedDate);
      return weekKey && totalQty > 0 ? new Map([[weekKey, totalQty]]) : new Map();
    })();
  if (!qtyByWeek.size) return chart;
  return replaceConfirmedSegments(chart, sku, qtyByWeek, dataAreaId);
}
