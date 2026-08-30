import { applyOpacity } from '../../utils/hexColor';
import { KPI_PIE_GRAY } from '../../utils/kpiCardStyles';

/**
 * Numeric share for a 2-slice KPI pie, or null when the card has no percentage.
 */
export function kpiPiePercent(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(100, Math.max(0, numeric));
}

/**
 * Rest slice is always 50% transparent gray. Fill comes from the threshold accent.
 */
export function kpiPieColors(fillOverride) {
  return {
    fill: fillOverride || applyOpacity(KPI_PIE_GRAY, 20),
    rest: applyOpacity(KPI_PIE_GRAY, 50),
  };
}

/**
 * SVG path for a pie slice starting at 12 o'clock, clockwise.
 */
export function pieSlicePath(percent, { cx = 50, cy = 50, r = 50 } = {}) {
  const value = kpiPiePercent(percent);
  if (value === null || value <= 0) return '';
  if (value >= 100) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const endAngle = -Math.PI / 2 + (value / 100) * 2 * Math.PI;
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = value > 50 ? 1 : 0;
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}
