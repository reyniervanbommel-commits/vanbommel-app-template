/**
 * Numeric share for a 2-slice KPI pie, or null when the card has no percentage.
 */
export function kpiPiePercent(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(100, Math.max(0, numeric));
}

function polarPoint(cx, cy, r, angleDeg) {
  const angleRad = (Math.PI / 180) * angleDeg;
  return [cx + r * Math.sin(angleRad), cy - r * Math.cos(angleRad)];
}

/**
 * SVG path for a pie wedge between 2 percent positions (0–100), starting at
 * 12 o'clock, clockwise. Used to draw both the value slice and the other slice.
 */
export function arcSlicePath(startPercent, endPercent, { cx = 50, cy = 50, r = 50 } = {}) {
  const start = Math.max(0, Math.min(100, startPercent));
  const end = Math.max(0, Math.min(100, endPercent));
  if (end <= start) return '';
  if (end - start >= 100) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const startAngle = (start / 100) * 360;
  const endAngle = (end / 100) * 360;
  const [x1, y1] = polarPoint(cx, cy, r, startAngle);
  const [x2, y2] = polarPoint(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/**
 * SVG path for a pie slice starting at 12 o'clock, clockwise, from 0 to `percent`.
 */
export function pieSlicePath(percent, options) {
  const value = kpiPiePercent(percent);
  if (value === null || value <= 0) return '';
  return arcSlicePath(0, value, options);
}

/**
 * Angle (degrees, 0 = 12 o'clock, clockwise) of the bisector between 2 percent
 * positions. Used to push the colored slice outward from the pie's center.
 */
export function pieBisectorAngle(startPercent, endPercent) {
  const mid = (startPercent + endPercent) / 2;
  return (mid / 100) * 360;
}

/**
 * x/y offset (in viewBox units) to push a slice outward along its bisector,
 * giving it a slightly "raised" look compared to the flat, uncolored slice.
 */
export function pieSliceOffset(angleDeg, distance) {
  const angleRad = (Math.PI / 180) * angleDeg;
  return { x: Math.sin(angleRad) * distance, y: -Math.cos(angleRad) * distance };
}
