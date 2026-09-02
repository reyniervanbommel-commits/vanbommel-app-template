/**
 * Unique item numbers from RCCP chart PO-stack segments.
 * @param {object[]} chart
 * @returns {string[]}
 */
export function collectRccpChartItemNumbers(chart) {
  const items = new Set();
  for (const point of chart || []) {
    const segs = [...(point.segmentsAbove || []), ...(point.segmentsBelow || [])];
    for (const segment of segs) {
      const itemNumber = String(segment?.itemNumber || '').trim();
      if (itemNumber) items.add(itemNumber);
    }
  }
  return [...items].sort((a, b) => a.localeCompare(b));
}

function selectedItemSet(selection) {
  if (selection instanceof Set) return selection;
  const values = Array.isArray(selection) ? selection : [selection];
  return new Set(values.map((value) => String(value || '').trim()).filter(Boolean));
}

/**
 * Whether a stack segment belongs to the selected unique item(s).
 * An empty selection shows every item.
 * @param {{ itemNumber?: string }} segment
 * @param {string | string[]} selection
 */
export function matchRccpChartItem(segment, selection) {
  const selected = selectedItemSet(selection);
  if (!selected.size) return true;
  return selected.has(String(segment?.itemNumber || '').trim());
}

function applyMeasureTotals(points, measureRows) {
  if (!measureRows?.length) return points;
  const openKey = measureRows.find((row) => row.isOpen)?.measureKey;
  const orderedKey = measureRows.find((row) => row.isOrdered)?.measureKey;
  const deliveredKey = measureRows.find((row) => row.isDelivered)?.measureKey;
  if (!openKey && !orderedKey && !deliveredKey) return points;
  return points.map((point) => {
    const next = { ...point };
    if (openKey) next[openKey] = sumStatus(point.segmentsAbove, 'open');
    if (orderedKey) {
      next[orderedKey] = sumStatus(point.segmentsAbove, 'open')
        + sumStatus(point.segmentsAbove, 'ordered');
    }
    if (deliveredKey) next[deliveredKey] = -sumStatus(point.segmentsBelow, 'received');
    return next;
  });
}

/**
 * Keep only stack segments for the selected unique item(s).
 * PO measure keys are rewritten from the remaining stacks when `measureRows` is set.
 * @param {object[]} chart
 * @param {string | string[]} selection
 * @param {{ emptyHidesAll?: boolean, containsTerm?: string, measureRows?: object[] }} [options]
 */
export function filterRccpChartByItem(chart, selection, options = {}) {
  const points = chart || [];
  const term = String(options.containsTerm || '').trim().toLowerCase();
  let next = points;
  if (term) {
    next = points.map((point) => ({
      ...point,
      segmentsAbove: (point.segmentsAbove || []).filter(
        (seg) => String(seg?.itemNumber || '').toLowerCase().includes(term),
      ),
      segmentsBelow: (point.segmentsBelow || []).filter(
        (seg) => String(seg?.itemNumber || '').toLowerCase().includes(term),
      ),
    }));
  } else {
    const selected = selectedItemSet(selection);
    if (!selected.size) {
      if (!options.emptyHidesAll) return points;
      next = points.map((point) => ({ ...point, segmentsAbove: [], segmentsBelow: [] }));
    } else {
      next = points.map((point) => ({
        ...point,
        segmentsAbove: (point.segmentsAbove || []).filter((seg) => matchRccpChartItem(seg, selected)),
        segmentsBelow: (point.segmentsBelow || []).filter((seg) => matchRccpChartItem(seg, selected)),
      }));
    }
  }
  return applyMeasureTotals(next, options.measureRows);
}

function periodToken(point) {
  if (point?.month != null) return `${point.year}|${point.month}`;
  return `${point.year}|${point.week}`;
}

function cellPeriodToken(cell) {
  return `${cell.periodYear}|${cell.periodMonth || cell.isoWeek}`;
}

function sumStatus(segments, status) {
  return (segments || []).reduce((sum, segment) => (
    segment?.status === status ? sum + (Number(segment.qty) || 0) : sum
  ), 0);
}

/**
 * Align PO-stack matrix rows with the (item-filtered) chart segments.
 * Capacity and warning rows stay vendor-level. Inactive filter returns the same Map.
 * @param {Map<string, object>} cellMap
 * @param {{ chart?: object[], measureRows?: object[], active?: boolean }} [options]
 * @returns {Map<string, object>}
 */
export function filterRccpMatrixByItem(cellMap, options = {}) {
  if (!options.active || !(cellMap instanceof Map)) return cellMap;
  const rows = options.measureRows || [];
  const openKey = rows.find((row) => row.isOpen)?.measureKey;
  const orderedKey = rows.find((row) => row.isOrdered)?.measureKey;
  const deliveredKey = rows.find((row) => row.isDelivered)?.measureKey;
  const overKey = rows.find((row) => row.isOvercapacity)?.measureKey;
  if (!openKey && !orderedKey && !deliveredKey) return cellMap;

  const qtyByPeriod = new Map();
  for (const point of options.chart || []) {
    qtyByPeriod.set(periodToken(point), {
      open: sumStatus(point.segmentsAbove, 'open'),
      ordered: sumStatus(point.segmentsAbove, 'ordered'),
      received: sumStatus(point.segmentsBelow, 'received'),
    });
  }

  const next = new Map();
  for (const [key, cell] of cellMap) {
    const qty = qtyByPeriod.get(cellPeriodToken(cell)) || { open: 0, ordered: 0, received: 0 };
    if (cell.measureKey === openKey) {
      next.set(key, { ...cell, confirmedQty: qty.open });
    } else if (cell.measureKey === orderedKey) {
      next.set(key, { ...cell, confirmedQty: qty.open + qty.ordered });
    } else if (cell.measureKey === deliveredKey) {
      next.set(key, { ...cell, confirmedQty: qty.received });
    } else if (cell.measureKey === overKey) {
      const over = (Number(cell.availableQty) || 0) - qty.open;
      next.set(key, { ...cell, confirmedQty: over, remainingQty: over });
    } else {
      next.set(key, cell);
    }
  }
  return next;
}
