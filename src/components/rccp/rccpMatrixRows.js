/**
 * Matrix row order and chart-visibility merge for the RCCP dashboard.
 * Ordered → received → remaining → Planning date (requested | confirmed) →
 * capacity → overcapacity (warning last).
 */

export const RCCP_PLANNING_DATE_HEADER_KEY = '__planning_date__';

function matrixRowRank(row) {
  if (row?.isWarning) return 90;
  if (row?.isOvercapacity) return 50;
  if (row?.isCapacity) return 40;
  if (row?.isConfirmedDelivery) return 36;
  if (row?.isRequestedDelivery) return 35;
  if (row?.isPlanningDateGroup) return 33;
  if (row?.isOpen) return 30;
  if (row?.isDelivered) return 20;
  return 10;
}

function planningDateHeaderRow() {
  return {
    measureKey: RCCP_PLANNING_DATE_HEADER_KEY,
    label: 'Planning date',
    showInChart: false,
    isPlanningDateGroup: true,
  };
}

export function sortRccpMatrixRows(rows) {
  const sorted = [...(rows || [])]
    .filter((row) => !row?.isPlanningDateGroup)
    .sort((a, b) => matrixRowRank(a) - matrixRowRank(b));
  const firstDate = sorted.findIndex(
    (row) => row.isRequestedDelivery || row.isConfirmedDelivery,
  );
  if (firstDate < 0) return sorted;
  sorted.splice(firstDate, 0, planningDateHeaderRow());
  return sorted;
}

export function planningDateFromMeasureKey(measureKey) {
  if (measureKey === '__requested_delivery__') return 'requested';
  if (measureKey === '__confirmed_delivery__') return 'confirmed';
  return null;
}

export function applyPlanningDateRowToggle(measureKey, checked, currentPlanningDate) {
  const next = planningDateFromMeasureKey(measureKey);
  if (!next) return currentPlanningDate === 'confirmed' ? 'confirmed' : 'requested';
  if (checked) return next;
  return currentPlanningDate === 'confirmed' ? 'confirmed' : 'requested';
}

export function overlayPlanningDateSwitches(visibleKeys, rows, planningDate) {
  const next = { ...(visibleKeys || {}) };
  const confirmed = planningDate === 'confirmed';
  for (const row of rows || []) {
    if (row.isRequestedDelivery) next[row.measureKey] = !confirmed;
    if (row.isConfirmedDelivery) next[row.measureKey] = confirmed;
  }
  return next;
}

export function mergeChartVisibleKeys(rows, prev = {}, stored = {}, options = {}) {
  const preferStored = Boolean(options.preferStored);
  const next = {};
  (rows || []).forEach((row) => {
    if (row.isPlanningDateGroup || row.isRequestedDelivery || row.isConfirmedDelivery) return;
    const key = row.measureKey;
    if (!preferStored && prev[key] !== undefined) next[key] = Boolean(prev[key]);
    else if (stored[key] !== undefined) next[key] = Boolean(stored[key]);
    else if (prev[key] !== undefined) next[key] = Boolean(prev[key]);
    else next[key] = row.showInChart !== false;
  });
  return next;
}
