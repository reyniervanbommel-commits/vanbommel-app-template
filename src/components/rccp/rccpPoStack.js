import {
  RCCP_CHART_Y_AXIS_WIDTH,
  RCCP_WEEK_COL_WIDTH,
} from './rccpUtils';

export const RCCP_PO_BAR_SIZE = Math.round(RCCP_WEEK_COL_WIDTH * 0.8);

/** Place a bar inside the ISO-week band at `index`. `slot`: left | right | center. */
export function weekBarBox(index, barWidth, slot = 'center') {
  const bandX = RCCP_CHART_Y_AXIS_WIDTH + Number(index) * RCCP_WEEK_COL_WIDTH;
  const width = Math.min(Math.max(0, Number(barWidth) || 0), RCCP_WEEK_COL_WIDTH);
  if (slot === 'left' || slot === 'right') {
    const pairWidth = Math.min(RCCP_WEEK_COL_WIDTH * 0.8, RCCP_WEEK_COL_WIDTH);
    const gap = 4;
    const half = Math.max(0, (pairWidth - gap) / 2);
    const start = bandX + (RCCP_WEEK_COL_WIDTH - pairWidth) / 2;
    if (slot === 'left') return { x: start, width: half };
    return { x: start + half + gap, width: half };
  }
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
 * (received first, then open).
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
 * Received-vakjes van hetzelfde item (boven én onder de as) horen bij elkaar.
 * @param {{ status?: string, itemNumber?: string }} segment
 * @param {string} highlightItem
 */
export function isReceivedPairHighlight(segment, highlightItem) {
  return Boolean(
    highlightItem
    && segment?.status === 'received'
    && segment.itemNumber === highlightItem
  );
}
