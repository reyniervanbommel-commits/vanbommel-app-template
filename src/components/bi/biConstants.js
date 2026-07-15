// Gedeelde constants voor de BI-feature (#AB:218). Labels in het Engels conform projectrichting.

import { SELECTABLE_STATUS_COLORS } from '../shared/ColorPalettePicker';

export const BOARD_KEY = 'purchase-orders';

export const CHART_TYPE_OPTIONS = [
  { key: 'bar', label: 'Bar' },
  { key: 'line', label: 'Line' },
  { key: 'pie', label: 'Pie' },
  { key: 'kpi', label: 'KPI' },
];

export const AGGREGATION_OPTIONS = [
  { key: 'sum', label: 'Sum' },
  { key: 'avg', label: 'Average' },
  { key: 'count', label: 'Count' },
  { key: 'min', label: 'Minimum' },
  { key: 'max', label: 'Maximum' },
];

export const DATE_GROUPING_OPTIONS = [
  { key: 'day', label: 'Per day' },
  { key: 'week', label: 'Per week' },
  { key: 'month', label: 'Per month' },
  { key: 'year', label: 'Per year' },
];

export const VISIBILITY_OPTIONS = [
  { key: 'private', label: 'Private' },
  { key: 'shared', label: 'Shared' },
];

export const CHART_WIDTH_OPTIONS = [
  { key: 1, label: 'Compact' },
  { key: 2, label: 'Standard' },
  { key: 3, label: 'Wide' },
];

export const CHART_COLOR_PALETTE = SELECTABLE_STATUS_COLORS;

export const DEFAULT_CHART_COLORS = Object.freeze([
  '#579bfc',
  '#e2445c',
  '#00c875',
  '#fdab3d',
  '#a25ddc',
  '#ff5ac4',
  '#037f4c',
  '#ffcb00',
  '#784bd1',
]);

export function resolveMeasures(config) {
  if (!config || typeof config !== 'object') return [];
  if (Array.isArray(config.measures) && config.measures.length) {
    return config.measures.filter(Boolean);
  }
  return config.measure ? [config.measure] : [];
}

export function supportsMultipleMeasures(type) {
  return type === 'bar' || type === 'line';
}

export function defaultColorForIndex(index) {
  return DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];
}

export function resolveChartColor(config, key, index = 0) {
  const colors = config?.options?.colors;
  if (colors && typeof colors === 'object' && colors[key]) return colors[key];
  return defaultColorForIndex(index);
}

export function stripWidthForSpan(gridSpan) {
  const span = Number(gridSpan) || 1;
  if (span >= 3) return 560;
  if (span >= 2) return 420;
  return 300;
}

export function gridSpanStyle(span) {
  const safe = [1, 2, 3].includes(Number(span)) ? Number(span) : 1;
  return { gridColumn: `span ${Math.min(safe * 4, 12)}` };
}

export function createEmptyChartConfig() {
  return {
    type: 'bar',
    dimension: '',
    measure: '',
    measures: [],
    aggregation: 'sum',
    dateGrouping: 'month',
    filters: [],
    options: {
      gridSpan: 1,
      colors: {},
    },
  };
}
