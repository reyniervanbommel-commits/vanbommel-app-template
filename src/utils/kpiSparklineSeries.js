/**
 * Sparkline- en compositiereeksen voor KPI-kaarten.
 * PO-board: per-order waarden. RCCP: 2-segment compositie uit totalen.
 */

import { kpiQtyForKey } from './poBoardKpis';

export const SPARKLINE_MAX_POINTS = 40;

const EMPTY = [];

function pair(left, right) {
  const a = Number(left) || 0;
  const b = Number(right) || 0;
  if (!(a > 0 || b > 0)) return EMPTY;
  return [a, b];
}

export function downsampleSeries(values, maxPoints = SPARKLINE_MAX_POINTS) {
  if (!Array.isArray(values) || !values.length) return [];
  if (values.length <= maxPoints) return values.slice();
  const last = values.length - 1;
  const out = [];
  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.round((i * last) / (maxPoints - 1));
    out.push(values[index]);
  }
  return out;
}

export function sparklineQtyForKey(entry, kpiKey) {
  if (!entry) return null;
  if (kpiKey === 'capacityShortfall' || kpiKey === 'overloadedWeeks') return null;
  if (kpiKey === 'validDates') {
    const ordered = (Number(entry.o) || 0) + (Number(entry.d) || 0);
    return Math.max(0, ordered - (Number(entry.yu) || 0));
  }
  if (kpiKey === 'deliveryReliability') return Number(entry.tu) || 0;
  if (kpiKey === 'lateItems') {
    const count = Number(entry.ln) || 0;
    return count > 0 ? (Number(entry.ls) || 0) / count : 0;
  }
  const qty = kpiQtyForKey(entry, kpiKey);
  return qty == null ? null : qty;
}

/**
 * @param {{ orders?: Record<string, object> }} payload
 * @param {string[]} visibleOrderNumbers
 * @param {string} kpiKey
 * @returns {number[]}
 */
export function buildKpiSparklineSeries(payload, visibleOrderNumbers, kpiKey) {
  const orders = payload?.orders || {};
  const values = [];
  for (const orderNumber of visibleOrderNumbers || []) {
    const qty = sparklineQtyForKey(orders[orderNumber], kpiKey);
    if (qty == null) continue;
    values.push(qty);
  }
  if (!values.length || values.every((value) => !(Number(value) > 0))) return [];
  return downsampleSeries(values);
}

export function buildKpiCompositionSeries(kpis, kpiKey) {
  if (!kpis) return EMPTY;
  switch (kpiKey) {
    case 'ordered':
      return pair(kpis.totalDelivered, kpis.totalOpen);
    case 'delivered':
      return pair(kpis.totalDelivered, kpis.totalOpen);
    case 'open':
      return pair(kpis.totalOpen, kpis.totalDelivered);
    case 'lateDelivery':
    case 'onTime':
    case 'deliveryReliability':
      return pair(
        kpiKey === 'lateDelivery' ? kpis.lateDeliveryUnits : kpis.onTimeUnits,
        kpiKey === 'lateDelivery' ? kpis.onTimeUnits : kpis.lateDeliveryUnits,
      );
    case 'openLate':
      return pair(kpis.openLateUnits, Math.max(0, (Number(kpis.totalOpen) || 0) - (Number(kpis.openLateUnits) || 0)));
    case 'planned1900':
      return pair(kpis.planned1900Units, kpis.validPlannedUnits);
    case 'validDates':
      return pair(kpis.validPlannedUnits, kpis.planned1900Units);
    default:
      return EMPTY;
  }
}

export function buildSparklineAreaPath(values, width = 100, height = 40) {
  if (!Array.isArray(values) || !values.length) return { line: '', area: '' };
  const max = Math.max(...values.map((value) => Number(value) || 0), 0);
  const range = max || 1;
  const last = values.length - 1;
  const coords = values.map((value, index) => {
    const x = last === 0 ? width / 2 : (index / last) * width;
    const y = height - ((Number(value) || 0) / range) * height * 0.92;
    return [x, y];
  });
  const line = coords.map(([x, y], index) => `${index ? 'L' : 'M'}${x},${y}`).join(' ');
  const firstX = coords[0][0];
  const lastX = coords[coords.length - 1][0];
  return { line, area: `${line} L${lastX},${height} L${firstX},${height} Z` };
}

export function resolveKpiSparklines(kpis, seriesByKey) {
  const keys = new Set([
    ...Object.keys(seriesByKey || {}),
    'ordered',
    'delivered',
    'open',
    'lateDelivery',
    'lateItems',
    'onTime',
    'openLate',
    'planned1900',
    'validDates',
    'deliveryReliability',
  ]);
  const map = {};
  keys.forEach((key) => {
    const fromBoard = seriesByKey?.[key];
    if (Array.isArray(fromBoard) && fromBoard.length) {
      map[key] = { values: fromBoard, variant: 'area' };
      return;
    }
    const values = buildKpiCompositionSeries(kpis, key);
    if (!values.length) return;
    map[key] = { values, variant: 'bar' };
  });
  return map;
}
