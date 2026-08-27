/**
 * Unique item numbers from RCCP chart PO-stack segments.
 * @param {object[]} chart
 * @returns {string[]}
 */
export function collectRccpChartItemNumbers(chart) {
  const items = new Set();
  for (const point of chart || []) {
    const segs = [
      ...(point.segmentsAbove || []),
      ...(point.segmentsBelow || []),
      ...(point.segmentsConfirmed || []),
    ];
    for (const segment of segs) {
      const itemNumber = String(segment?.itemNumber || '').trim();
      if (itemNumber) items.add(itemNumber);
    }
  }
  return [...items].sort((a, b) => a.localeCompare(b));
}

/**
 * Whether a stack segment belongs to the selected unique item.
 * An empty selection shows every item.
 * @param {{ itemNumber?: string }} segment
 * @param {string} itemNumber
 */
export function matchRccpChartItem(segment, itemNumber) {
  const selected = String(itemNumber || '').trim();
  if (!selected) return true;
  return String(segment?.itemNumber || '').trim() === selected;
}

/**
 * Keep only stack segments for the selected unique item.
 * Capacity/load series on the point are unchanged.
 * @param {object[]} chart
 * @param {string} itemNumber
 */
export function filterRccpChartByItem(chart, itemNumber) {
  const points = chart || [];
  const selected = String(itemNumber || '').trim();
  if (!selected) return points;
  return points.map((point) => ({
    ...point,
    segmentsAbove: (point.segmentsAbove || []).filter((seg) => matchRccpChartItem(seg, selected)),
    segmentsBelow: (point.segmentsBelow || []).filter((seg) => matchRccpChartItem(seg, selected)),
    segmentsConfirmed: (point.segmentsConfirmed || []).filter((seg) => matchRccpChartItem(seg, selected)),
  }));
}
