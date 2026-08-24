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
 * Mix a hex colour with white. `ratio` 0 = original, 1 = white.
 * @param {string} hex
 * @param {number} [ratio]
 */
export function lightenHex(hex, ratio = 0.45) {
  const raw = String(hex || '').replace('#', '');
  const rgb = raw.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(rgb)) return '#B4D6F6';
  const mix = (channel) => Math.round(parseInt(channel, 16) * (1 - ratio) + 255 * ratio);
  const r = mix(rgb.slice(0, 2));
  const g = mix(rgb.slice(2, 4));
  const b = mix(rgb.slice(4, 6));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
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
 * Stack layout from the axis outward. Segments are drawn in array order
 * (received first, then open).
 */
export function stackRectLayout(segments, barY, barHeight, side) {
  const list = Array.isArray(segments) ? segments : [];
  const total = list.reduce((sum, seg) => sum + Number(seg.qty || 0), 0);
  const height = Math.abs(barHeight) || 0;
  if (!total || !height) return [];
  let cursor = side === 'above' ? barY + height : barY;
  return list.map((segment) => {
    const segHeight = (Number(segment.qty || 0) / total) * height;
    if (side === 'above') cursor -= segHeight;
    const y = cursor;
    if (side === 'below') cursor += segHeight;
    return { y, height: segHeight, segment };
  });
}
