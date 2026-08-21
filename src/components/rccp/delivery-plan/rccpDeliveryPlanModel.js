import { tokens } from '@fluentui/react-components';
import { compareIsoWeek, formatWeekLabel } from '../rccpUtils';

export const WEEK_COLOR_TOKENS = Object.freeze([
  tokens.colorPaletteBlueForeground2,
  tokens.colorPaletteTealForeground2,
  tokens.colorPaletteGreenForeground2,
  tokens.colorPaletteBerryForeground2,
  tokens.colorPalettePurpleForeground2,
  tokens.colorPaletteLilacForeground2,
  tokens.colorPaletteMarigoldForeground2,
  tokens.colorPaletteDarkOrangeForeground2,
  tokens.colorPaletteNavyForeground2,
  tokens.colorPalettePinkForeground2,
]);

export function hashWeekKey(key) {
  let hash = 0;
  const text = String(key || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function weekColor(year, week) {
  const key = formatWeekLabel(year, week);
  return WEEK_COLOR_TOKENS[hashWeekKey(key) % WEEK_COLOR_TOKENS.length];
}

export function currentIsoWeek(now = new Date()) {
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const yearStartDay = yearStart.getUTCDay() || 7;
  yearStart.setUTCDate(yearStart.getUTCDate() + 4 - yearStartDay);
  return {
    year: target.getUTCFullYear(),
    week: 1 + Math.round((target - yearStart) / (7 * 24 * 60 * 60 * 1000)),
  };
}

function isoParts(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return currentIsoWeek(date);
}

export function formatPlanDate(value) {
  if (!value) return 'not yet delivered';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'not yet delivered';
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getUTCFullYear()}`;
}

export function formatQty(value) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatDelayLabel(weeks) {
  if (weeks == null || weeks === 0) return '';
  return weeks > 0 ? `+${weeks}w` : `−${Math.abs(weeks)}w`;
}

export function formatVarianceText(weeks) {
  if (weeks == null || weeks === 0) return '';
  const abs = Math.abs(weeks);
  return weeks > 0 ? `${abs} week(s) late` : `${abs} week(s) early`;
}

export function formatDetailLine(order) {
  if (!order) return '';
  const variance = formatVarianceText(order.delayWeeks);
  const parts = [
    order.purchaseOrderNumber,
    `line ${order.lineNumber || '—'}`,
    `ordered ${formatQty(order.orderedQty)}`,
    `delivered ${formatQty(order.deliveredQty)}`,
    `open ${formatQty(order.openQty)}`,
    `planned ${formatPlanDate(order.plannedDate)}`,
    `delivered ${formatPlanDate(order.deliveredDate)}`,
  ];
  if (variance) parts.push(variance);
  return parts.join(' · ');
}

export function buildTooltipRows(order) {
  if (!order) return [];
  const rows = [
    { label: 'Order', value: order.purchaseOrderNumber },
    { label: 'Line', value: order.lineNumber || '—' },
    { label: 'Ordered', value: formatQty(order.orderedQty) },
    { label: 'Delivered', value: formatQty(order.deliveredQty) },
    { label: 'Open', value: formatQty(order.openQty) },
    { label: 'Planned', value: formatPlanDate(order.plannedDate) },
    { label: 'Actually delivered', value: formatPlanDate(order.deliveredDate) },
  ];
  const variance = formatVarianceText(order.delayWeeks);
  if (variance) rows.push({ label: 'Variance', value: variance });
  return rows;
}

function isOverdue(planned, today, openQty) {
  if (!planned || openQty <= 0) return false;
  return compareIsoWeek(planned.year, planned.week, today.year, today.week) < 0;
}

/**
 * Groepeert API-orders tot Recharts-punten: planning boven, ontvangst onder.
 */
export function buildChartModel(orders, weeks, weeklyCapacity, now = new Date()) {
  const today = currentIsoWeek(now);
  const byId = new Map((orders || []).map((order) => [order.orderId, order]));
  const points = (weeks || []).map((week) => {
    const key = week.key || formatWeekLabel(week.year, week.week);
    const color = weekColor(week.year, week.week);
    const planningSegments = [];
    const receiptSegments = [];

    for (const order of orders || []) {
      const planned = isoParts(order.plannedDate);
      if (planned && planned.year === week.year && planned.week === week.week) {
        if (order.deliveredQty > 0) {
          planningSegments.push({
            orderId: order.orderId,
            qty: order.deliveredQty,
            type: 'delivered',
            color,
            overdue: false,
            delayWeeks: order.delayWeeks,
          });
        }
        if (order.openQty > 0) {
          planningSegments.push({
            orderId: order.orderId,
            qty: order.openQty,
            type: 'open',
            color,
            overdue: isOverdue(planned, today, order.openQty),
            delayWeeks: order.delayWeeks,
          });
        }
      }
      const delivered = isoParts(order.deliveredDate);
      if (delivered && delivered.year === week.year && delivered.week === week.week && order.deliveredQty > 0) {
        const planColor = planned ? weekColor(planned.year, planned.week) : color;
        receiptSegments.push({
          orderId: order.orderId,
          qty: order.deliveredQty,
          type: 'receipt',
          color: planColor,
          overdue: false,
          delayWeeks: order.delayWeeks,
        });
      }
    }

    const planningTotal = planningSegments.reduce((sum, seg) => sum + seg.qty, 0);
    const receiptTotal = receiptSegments.reduce((sum, seg) => sum + seg.qty, 0);
    const hasCapacity = Object.prototype.hasOwnProperty.call(weeklyCapacity || {}, key);
    const capacity = hasCapacity ? Number(weeklyCapacity[key]) : null;

    return {
      key,
      year: week.year,
      week: week.week,
      color,
      planningSegments,
      receiptSegments,
      planningTotal,
      receiptTotal,
      receiptPlot: receiptTotal ? -receiptTotal : 0,
      capacity,
      overCapacity: capacity != null && planningTotal > capacity
        ? planningTotal - capacity
        : 0,
      isToday: today.year === week.year && today.week === week.week,
    };
  });

  const yMax = Math.max(
    1,
    ...points.map((p) => p.planningTotal),
    ...points.map((p) => p.receiptTotal),
    ...points.map((p) => (p.capacity == null ? 0 : p.capacity)),
  );

  return {
    points,
    yMax,
    today,
    todayKey: points.find((p) => p.isToday)?.key || null,
    ordersById: byId,
  };
}
