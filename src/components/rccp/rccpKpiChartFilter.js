import { PO_BOARD_CLICKABLE_KPI_KEYS } from '../../utils/poBoardKpis';

export const RCCP_CLICKABLE_KPI_KEYS = [
  ...PO_BOARD_CLICKABLE_KPI_KEYS,
  'capacityShortfall',
  'overloadedWeeks',
];

const CAPACITY_KPI_KEYS = new Set(['capacityShortfall', 'overloadedWeeks']);
const LATE_RECEIPT_KEYS = new Set(['lateDelivery', 'lateItems']);

function isCapacityKpi(kpiKey) {
  return CAPACITY_KPI_KEYS.has(kpiKey);
}

function matchAbove(segment, kpiKey) {
  const status = segment?.status;
  const late = Boolean(segment?.late);
  const planned1900 = Boolean(segment?.planned1900);
  if (kpiKey === 'ordered') return status === 'open' || status === 'ordered';
  if (kpiKey === 'delivered') return status === 'received';
  if (kpiKey === 'open') return status === 'open';
  if (kpiKey === 'openLate') return status === 'open' && late;
  if (kpiKey === 'planned1900') return planned1900;
  if (LATE_RECEIPT_KEYS.has(kpiKey) || kpiKey === 'onTime') return false;
  return true;
}

function matchBelow(segment, kpiKey) {
  const late = Boolean(segment?.late);
  const onTime = Boolean(segment?.onTime);
  const planned1900 = Boolean(segment?.planned1900);
  if (kpiKey === 'ordered' || kpiKey === 'delivered') return true;
  if (kpiKey === 'open' || kpiKey === 'openLate') return false;
  if (LATE_RECEIPT_KEYS.has(kpiKey)) return late;
  if (kpiKey === 'onTime') return onTime;
  if (kpiKey === 'planned1900') return planned1900;
  return true;
}

function pointHasMatchingStack(point, kpiKey) {
  const above = (point.segmentsAbove || []).some((seg) => matchAbove(seg, kpiKey));
  const below = (point.segmentsBelow || []).some((seg) => matchBelow(seg, kpiKey));
  return above || below;
}

/**
 * Keep PO-stack segments that belong to the selected KPI.
 * Capacity cards do not strip stacks.
 * @param {object[]} chart
 * @param {string|null} kpiKey
 */
export function filterRccpChartByKpi(chart, kpiKey) {
  const points = chart || [];
  if (!kpiKey || isCapacityKpi(kpiKey)) return points;
  return points.map((point) => ({
    ...point,
    segmentsAbove: (point.segmentsAbove || []).filter((seg) => matchAbove(seg, kpiKey)),
    segmentsBelow: (point.segmentsBelow || []).filter((seg) => matchBelow(seg, kpiKey)),
  }));
}

function highlightMeasureKeys(measureRows, kpiKey) {
  const rows = measureRows || [];
  if (isCapacityKpi(kpiKey)) {
    return rows.filter((row) => row.isOvercapacity).map((row) => row.measureKey);
  }
  if (kpiKey === 'open' || kpiKey === 'openLate') {
    return rows.filter((row) => row.isOpen).map((row) => row.measureKey);
  }
  if (kpiKey === 'delivered' || LATE_RECEIPT_KEYS.has(kpiKey) || kpiKey === 'onTime') {
    return rows.filter((row) => row.isDelivered).map((row) => row.measureKey);
  }
  if (kpiKey === 'ordered' || kpiKey === 'planned1900') {
    return rows.filter((row) => row.isOpen || row.isOrdered || row.isDelivered).map((row) => row.measureKey);
  }
  return [];
}

function highlightWeeks(chart, kpiKey) {
  if (isCapacityKpi(kpiKey)) {
    return (chart || []).filter((point) => point.__overloaded__).map((point) => point.key);
  }
  const filtered = filterRccpChartByKpi(chart, kpiKey);
  return filtered.filter((point) => pointHasMatchingStack(point, kpiKey)).map((point) => point.key);
}

/**
 * Weeks and matrix rows to highlight for the selected KPI.
 * @returns {{ weeks: string[], measureKeys: string[] }}
 */
export function buildRccpKpiMatrixHighlight(chart, measureRows, kpiKey) {
  if (!kpiKey) return { weeks: [], measureKeys: [] };
  return {
    weeks: highlightWeeks(chart, kpiKey),
    measureKeys: highlightMeasureKeys(measureRows, kpiKey),
  };
}
