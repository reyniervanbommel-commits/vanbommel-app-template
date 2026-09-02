import {
  RCCP_CHART_Y_AXIS_WIDTH,
  RCCP_WEEK_COL_WIDTH,
} from './rccpUtils';

export const RCCP_PO_BAR_SIZE = Math.round(RCCP_WEEK_COL_WIDTH * 0.8);

/** Center a bar of `barWidth` inside the ISO-week band at `index`. */
export function weekBarBox(index, barWidth) {
  const bandX = RCCP_CHART_Y_AXIS_WIDTH + Number(index) * RCCP_WEEK_COL_WIDTH;
  const width = Math.min(Math.max(0, Number(barWidth) || 0), RCCP_WEEK_COL_WIDTH);
  return { x: bandX + (RCCP_WEEK_COL_WIDTH - width) / 2, width };
}

function utcDayDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** @returns {{ year: number, week: number, key: string, weekday: number }} weekday 1=Mon … 7=Sun */
export function isoWeekPartsUtc(date) {
  const utc = utcDayDate(date);
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const year = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearStartDay = yearStart.getUTCDay() || 7;
  yearStart.setUTCDate(yearStart.getUTCDate() + 4 - yearStartDay);
  const week = 1 + Math.round((utc - yearStart) / (7 * 24 * 60 * 60 * 1000));
  return { year, week, key: `${year}-W${String(week).padStart(2, '0')}`, weekday };
}

/**
 * X-coordinate of the Today line inside the chart plot.
 * `null` when the current ISO week is not in `periods`.
 */
export function todayLineX(periods, now = new Date()) {
  const band = todayBand(periods, now);
  return band ? band.todayX : null;
}

/**
 * Current-period highlight: full column band plus the today line inside it.
 * `null` when the current period is outside the window.
 */
export function todayBand(periods, now = new Date()) {
  if (!Array.isArray(periods) || !periods.length) return null;
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let index = -1;
  let fraction = 0.5;
  if (periods[0].month) {
    const year = utc.getUTCFullYear();
    const month = utc.getUTCMonth() + 1;
    index = periods.findIndex((period) => period.year === year && period.month === month);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    fraction = (utc.getUTCDate() - 0.5) / daysInMonth;
  } else {
    const parts = isoWeekPartsUtc(now);
    index = periods.findIndex((period) => period.key === parts.key);
    fraction = (parts.weekday - 0.5) / 7;
  }
  if (index < 0) return null;
  const bandX = RCCP_CHART_Y_AXIS_WIDTH + index * RCCP_WEEK_COL_WIDTH;
  return {
    index,
    bandX,
    bandWidth: RCCP_WEEK_COL_WIDTH,
    todayX: bandX + fraction * RCCP_WEEK_COL_WIDTH,
  };
}

/** True when a matrix/chart period column is the current ISO week or calendar month. */
export function isCurrentMatrixPeriod(period, now = new Date()) {
  if (!period) return false;
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period.month) {
    return period.year === utc.getUTCFullYear() && Number(period.month) === utc.getUTCMonth() + 1;
  }
  return period.key === isoWeekPartsUtc(now).key;
}

/**
 * Recharts geeft bij negatieve waarden y = ver-einde en height < 0.
 * Normaliseer naar SVG-rect: y = top (as-kant), height > 0.
 */
export function normalizeBarBox(barY, barHeight) {
  const signed = Number(barHeight) || 0;
  const top = signed < 0 ? Number(barY) + signed : Number(barY);
  return { y: top, height: Math.abs(signed) };
}

/**
 * Stack layout from the axis outward. Segments are drawn in array order
 * (ordered filled first, then open).
 */
export function stackRectLayout(segments, barY, barHeight, side) {
  const list = Array.isArray(segments) ? segments : [];
  const total = list.reduce((sum, seg) => sum + Number(seg.qty || 0), 0);
  const { y: top, height } = normalizeBarBox(barY, barHeight);
  if (!total || !height) return [];
  let cursor = side === 'above' ? top + height : top;
  return list.map((segment) => {
    const segHeight = (Number(segment.qty || 0) / total) * height;
    if (side === 'above') cursor -= segHeight;
    const y = cursor;
    if (side === 'below') cursor += segHeight;
    return { y, height: segHeight, segment };
  });
}

/**
 * Received-vakjes onder de as en ordered-vakjes boven horen bij hetzelfde item.
 */
export function isReceivedPairHighlight(segment, highlightItem) {
  return Boolean(
    highlightItem
    && (segment?.status === 'received' || segment?.status === 'ordered')
    && segment.itemNumber === highlightItem
  );
}

const PAIR_STROKE = '#323130';

/** Hover pair outline only — late receipts have no extra frame. */
export function poSegmentStroke(_segment, highlighted) {
  if (highlighted) return { stroke: PAIR_STROKE, strokeWidth: 2.5 };
  return { stroke: 'none', strokeWidth: 0 };
}

/**
 * Quantity (ordered) against the axis, remaining (open) grouped at the top.
 * Remaining stays visible when quantity is toggled off.
 */
export function visibleAboveSegments(segments, { openVisible, orderedVisible } = {}) {
  const ordered = [];
  const remaining = [];
  for (const segment of segments || []) {
    if (segment?.status === 'open') {
      if (openVisible) remaining.push(segment);
    } else if (segment?.status === 'ordered') {
      if (orderedVisible) ordered.push(segment);
    }
  }
  return [...ordered, ...remaining];
}

/**
 * Snap a magnitude up to 1-2-5 × 10^n (100, 200, 500, 1000, …).
 * Mid-ticks then land on round values including 250 and 2500.
 */
export function rccpNiceYExtent(value) {
  const n = Math.abs(Number(value) || 0);
  if (n === 0) return 1;
  const exp = Math.floor(Math.log10(n));
  const base = 10 ** exp;
  const mantissa = n / base;
  let nice = 10;
  if (mantissa <= 1) nice = 1;
  else if (mantissa <= 2) nice = 2;
  else if (mantissa <= 5) nice = 5;
  return nice * base;
}

function rccpYAxisTicks(extent) {
  const half = extent / 2;
  return [-extent, -half, 0, half, extent];
}

/**
 * Y-domain for Capacity vs load. Custom PO-stack bars are ignored by Recharts 3,
 * so a negative-only received series would otherwise hide quantity above the axis.
 * Positive and negative sides share the same absolute scale, snapped to round ticks.
 */
export function rccpChartYDomain(points, measureKeys = []) {
  let min = 0;
  let max = 0;
  for (const point of points || []) {
    max = Math.max(max, Number(point.__stackAbove) || 0);
    min = Math.min(min, Number(point.__stackBelow) || 0);
    for (const key of measureKeys) {
      const value = Number(point[key]) || 0;
      max = Math.max(max, value);
      min = Math.min(min, value);
    }
  }
  if (min === 0 && max === 0) return [0, 1];
  const extent = rccpNiceYExtent(Math.max(Math.abs(min), Math.abs(max)));
  return [-extent, extent];
}

/**
 * Recharts 3 discards a numeric Y domain unless allowDataOverflow is set.
 * Without that, custom PO bars are ignored and the axis falls back to [0, auto].
 */
export function rccpSymmetricYAxisDomain(yDomain) {
  const raw = Math.max(
    Math.abs(Number(yDomain?.[0]) || 0),
    Math.abs(Number(yDomain?.[1]) || 0),
  );
  const extent = rccpNiceYExtent(raw);
  return {
    type: 'number',
    domain: [-extent, extent],
    allowDataOverflow: true,
    ticks: rccpYAxisTicks(extent),
  };
}

export function rccpPoStackBarFlags({ openVisible, orderedVisible, deliveredVisible }) {
  return {
    showAbove: Boolean(openVisible || orderedVisible || deliveredVisible),
    showBelow: Boolean(deliveredVisible),
  };
}
