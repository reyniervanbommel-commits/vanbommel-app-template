/**
 * Cheap fingerprint of RCCP stack contents. Used to replay a CSS fade without
 * walking the chart on hover or every render of the plot itself.
 * @param {object[]} [chart]
 * @returns {string}
 */
export function rccpChartFlashSignature(chart) {
  let segments = 0;
  let qty = 0;
  for (const point of chart || []) {
    const above = point.segmentsAbove || [];
    const below = point.segmentsBelow || [];
    segments += above.length + below.length;
    for (const segment of above) qty += Number(segment.qty) || 0;
    for (const segment of below) qty += Number(segment.qty) || 0;
  }
  return `${(chart || []).length}:${segments}:${qty}`;
}
