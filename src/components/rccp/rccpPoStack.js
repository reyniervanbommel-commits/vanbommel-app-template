import {
  RCCP_CHART_Y_AXIS_WIDTH,
  RCCP_WEEK_COL_WIDTH,
} from './rccpUtils';

export const RCCP_PO_BAR_SIZE = Math.round(RCCP_WEEK_COL_WIDTH * 0.8);

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
  if (!Array.isArray(periods) || !periods.length) return null;
  const parts = isoWeekPartsUtc(now);
  const index = periods.findIndex((period) => period.key === parts.key);
  if (index < 0) return null;
  return RCCP_CHART_Y_AXIS_WIDTH + (index + (parts.weekday - 0.5) / 7) * RCCP_WEEK_COL_WIDTH;
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
