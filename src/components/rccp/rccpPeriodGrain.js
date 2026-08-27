import { isoWeekStartUtc } from './rccpUtils';

export const RCCP_PERIOD_GRAIN_WEEK = 'week';
export const RCCP_PERIOD_GRAIN_MONTH = 'month';

function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * Calendar month of the Monday that starts the ISO week.
 * @returns {{ year: number, month: number, key: string }}
 */
export function monthBucketFromIsoWeek(year, week) {
  const monday = isoWeekStartUtc(year, week);
  const calendarYear = monday.getUTCFullYear();
  const month = monday.getUTCMonth() + 1;
  return {
    year: calendarYear,
    month,
    key: `${calendarYear}-M${pad2(month)}`,
  };
}

function buildCellMap(cells) {
  const map = new Map();
  for (const cell of cells || []) {
    const token = cell.periodMonth || cell.isoWeek;
    map.set(`${cell.measureKey}|${cell.periodYear}|${token}`, cell);
  }
  return map;
}

const SKIP_CHART_KEYS = new Set([
  'key', 'year', 'week', 'month', 'lastWeek', 'lastYear',
  'segmentsAbove', 'segmentsBelow', '__overloaded__',
  '__stackAbove', '__stackBelow', '__openColor', '__receivedColor',
  '__barWidthAbove', '__barWidthBelow',
]);

function mergeSegments(lists) {
  const map = new Map();
  for (const segment of lists.flat()) {
    if (!segment) continue;
    const id = `${segment.itemNumber}\0${segment.status}`;
    const prev = map.get(id);
    if (!prev) {
      map.set(id, { ...segment, qty: Number(segment.qty) || 0 });
      continue;
    }
    prev.qty += Number(segment.qty) || 0;
    prev.late = Boolean(prev.late || segment.late);
    if (!prev.dataAreaId && segment.dataAreaId) prev.dataAreaId = segment.dataAreaId;
  }
  return [...map.values()].sort((a, b) => {
    const byItem = String(a.itemNumber || '').localeCompare(String(b.itemNumber || ''));
    if (byItem) return byItem;
    if (a.status === b.status) return 0;
    return a.status === 'received' ? -1 : 1;
  });
}

function sumChartGroup(points, bucket, first, last) {
  const next = {
    key: bucket.key,
    year: bucket.year,
    week: first.week,
    month: bucket.month,
    lastWeek: last.week,
    lastYear: last.year,
    segmentsAbove: mergeSegments(points.map((point) => point.segmentsAbove || [])),
    segmentsBelow: mergeSegments(points.map((point) => point.segmentsBelow || [])),
  };
  for (const point of points) {
    Object.keys(point).forEach((key) => {
      if (SKIP_CHART_KEYS.has(key)) return;
      const value = point[key];
      if (typeof value !== 'number') return;
      next[key] = (Number(next[key]) || 0) + value;
    });
  }
  const capacity = Number(next.__capacity__) || 0;
  const load = Object.entries(next).reduce((sum, [key, value]) => {
    if (SKIP_CHART_KEYS.has(key) || key.startsWith('__') || typeof value !== 'number' || value <= 0) {
      return sum;
    }
    return sum + value;
  }, 0);
  next.__overloaded__ = capacity > 0 && load > capacity;
  return next;
}

const STATUS_RANK = { red: 3, orange: 2, green: 1, grey: 0 };

function worstStatus(cells) {
  return cells.reduce((best, cell) => {
    const rank = STATUS_RANK[cell.statusColor] || 0;
    if (rank > (STATUS_RANK[best.statusColor] || 0)) return cell;
    return best;
  }, cells[0] || {});
}

function sumCellGroup(group, bucket) {
  const worst = worstStatus(group);
  return {
    ...worst,
    periodYear: bucket.year,
    isoWeek: bucket.month,
    periodMonth: bucket.month,
    confirmedQty: group.reduce((sum, cell) => sum + (Number(cell.confirmedQty) || 0), 0),
    availableQty: group.reduce((sum, cell) => sum + (Number(cell.availableQty) || 0), 0),
  };
}

function groupByMonthKey(items, getYearWeek) {
  const groups = [];
  const indexByKey = new Map();
  for (const item of items) {
    const { year, week } = getYearWeek(item);
    const bucket = monthBucketFromIsoWeek(year, week);
    let group = indexByKey.get(bucket.key);
    if (!group) {
      group = { bucket, items: [] };
      indexByKey.set(bucket.key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

/**
 * Week grain returns the source series. Month grain rolls ISO weeks into
 * calendar months (Monday of each week) for the capacity chart and matrix.
 */
export function resolveRccpChartView({ grain, periods, chart, cells }) {
  const safePeriods = periods || [];
  const safeChart = chart || [];
  const safeCells = cells || [];
  if (grain !== RCCP_PERIOD_GRAIN_MONTH) {
    return { periods: safePeriods, chart: safeChart, cellMap: buildCellMap(safeCells) };
  }

  const periodGroups = groupByMonthKey(safePeriods, (period) => ({
    year: period.year, week: period.week,
  }));
  const chartByKey = new Map(safeChart.map((point) => [point.key, point]));
  const nextPeriods = periodGroups.map(({ bucket, items }) => {
    const first = items[0];
    const last = items[items.length - 1];
    return {
      year: bucket.year,
      month: bucket.month,
      key: bucket.key,
      week: first.week,
      lastWeek: last.week,
      lastYear: last.year,
    };
  });
  const nextChart = periodGroups.map(({ bucket, items }) => {
    const points = items.map((period) => chartByKey.get(period.key)).filter(Boolean);
    const first = items[0];
    const last = items[items.length - 1];
    return sumChartGroup(points, bucket, first, last);
  });
  const cellGroups = groupByMonthKey(safeCells, (cell) => ({
    year: cell.periodYear, week: cell.isoWeek,
  }));
  const cellsByMonthMeasure = new Map();
  for (const { bucket, items } of cellGroups) {
    const byMeasure = new Map();
    for (const cell of items) {
      const list = byMeasure.get(cell.measureKey) || [];
      list.push(cell);
      byMeasure.set(cell.measureKey, list);
    }
    cellsByMonthMeasure.set(bucket.key, { bucket, byMeasure });
  }
  const nextCells = [];
  for (const period of nextPeriods) {
    const group = cellsByMonthMeasure.get(period.key);
    if (!group) continue;
    for (const measureCells of group.byMeasure.values()) {
      nextCells.push(sumCellGroup(measureCells, group.bucket));
    }
  }

  return { periods: nextPeriods, chart: nextChart, cellMap: buildCellMap(nextCells) };
}
