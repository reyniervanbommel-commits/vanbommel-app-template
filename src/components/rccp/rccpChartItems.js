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

/**
 * Keep only stack segments for the selected unique item(s).
 * Capacity/load series on the point are unchanged.
 * @param {object[]} chart
 * @param {string | string[]} selection
 */
export function filterRccpChartByItem(chart, selection) {
  const points = chart || [];
  const selected = selectedItemSet(selection);
  if (!selected.size) return points;
  return points.map((point) => ({
    ...point,
    segmentsAbove: (point.segmentsAbove || []).filter((seg) => matchRccpChartItem(seg, selected)),
    segmentsBelow: (point.segmentsBelow || []).filter((seg) => matchRccpChartItem(seg, selected)),
  }));
}
