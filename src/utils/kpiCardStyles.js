import { applyOpacity } from './hexColor';

export const KPI_STYLE_KEYS = Object.freeze(['delivered', 'open', 'lateDelivery', 'onTime']);
export const KPI_CARDS_BOARD_KEY = 'kpi-cards';

/** Palette red / green / gray (same swatches as the app color picker). */
export const KPI_THRESHOLD_RED = '#e2445c';
export const KPI_THRESHOLD_GREEN = '#00c875';
export const KPI_PIE_GRAY = '#c4c4c4';

const DEFAULT_STYLE = Object.freeze({ threshold: null });

export function defaultKpiCardStyle() {
  return DEFAULT_STYLE;
}

function thresholdValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(100, Math.max(0, numeric));
}

export function normalizeKpiCardStyle(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  return { threshold: thresholdValue(input.threshold) };
}

export function normalizeKpiCardStyles(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const next = {};
  KPI_STYLE_KEYS.forEach((key) => {
    next[key] = normalizeKpiCardStyle(input[key]);
  });
  return next;
}

/**
 * Fill color for pie and % label. Threshold is inclusive (≥).
 * No threshold: gray at 80% transparency. Below: opaque red. At/above: opaque green.
 */
export function resolveKpiAccentColor(percent, style) {
  if (style?.threshold === null || style?.threshold === undefined) {
    return applyOpacity(KPI_PIE_GRAY, 20);
  }
  const value = Number(percent);
  if (!Number.isFinite(value) || value < style.threshold) return KPI_THRESHOLD_RED;
  return KPI_THRESHOLD_GREEN;
}

export function resolveKpiPieColors(percent, style) {
  return {
    fill: resolveKpiAccentColor(percent, style),
    rest: applyOpacity(KPI_PIE_GRAY, 50),
  };
}
