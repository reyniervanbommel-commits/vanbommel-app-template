// Gedeelde constants voor de BI-feature (#AB:218). Labels in het Engels conform projectrichting.

import { SELECTABLE_STATUS_COLORS } from '../shared/ColorPalettePicker';

export const BOARD_KEY = 'purchase-orders';

export const CHART_GRID_COLUMNS = 60;

export const CHART_SIZE_SMALL = 'small';
export const CHART_SIZE_MEDIUM = 'medium';
export const CHART_SIZE_WIDE = 'wide';

export const SERIES_COLOR_KEY = '__series__';

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

/** Alleen bar/line: medium = 4 per rij, wide = 60% breedte. */
export const CHART_SIZE_OPTIONS_BAR_LINE = [
  { key: CHART_SIZE_MEDIUM, label: 'Medium' },
  { key: CHART_SIZE_WIDE, label: 'Wide' },
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

function migrateStoredChartSize(config) {
  const options = config?.options || {};
  if ([CHART_SIZE_SMALL, CHART_SIZE_MEDIUM, CHART_SIZE_WIDE].includes(options.chartSize)) {
    return options.chartSize;
  }
  const span = Number(options.gridSpan);
  if (span >= 3) return CHART_SIZE_WIDE;
  if (span >= 2) return CHART_SIZE_MEDIUM;
  return null;
}

/** KPI=small, pie=medium, bar/line=medium|wide (keuze). */
export function resolveChartSize(chart) {
  const config = chart?.config || chart;
  const type = config?.type || 'bar';
  const stored = migrateStoredChartSize(config);
  if (type === 'kpi') return CHART_SIZE_SMALL;
  if (type === 'pie') return CHART_SIZE_MEDIUM;
  if (type === 'bar' || type === 'line') {
    return stored === CHART_SIZE_WIDE ? CHART_SIZE_WIDE : CHART_SIZE_MEDIUM;
  }
  return CHART_SIZE_MEDIUM;
}

function resolveChartType(chart) {
  const config = chart?.config || chart;
  return config?.type || 'bar';
}

/** Grid-span op 60 kolommen; KPI/pie −30%, wide bar/line −20%. */
export function resolveGridSpan(chart) {
  const type = resolveChartType(chart);
  const size = resolveChartSize(chart);
  if (type === 'kpi') return 8;
  if (type === 'pie') return 11;
  if (size === CHART_SIZE_WIDE) return 36;
  return 15;
}

export function chartGridStyle(chart) {
  return { gridColumn: `span ${resolveGridSpan(chart)}` };
}

export function stripCardStyle(chart) {
  const type = resolveChartType(chart);
  const size = resolveChartSize(chart);
  if (size === CHART_SIZE_WIDE) {
    return { flex: '0 0 60%', minWidth: '384px', maxWidth: '60%' };
  }
  if (size === CHART_SIZE_SMALL) {
    return { flex: '0 0 14%', minWidth: '140px', maxWidth: '14%' };
  }
  if (type === 'pie') {
    return { flex: '0 0 17.5%', minWidth: '182px', maxWidth: '17.5%' };
  }
  return { flex: '0 0 25%', minWidth: '260px', maxWidth: '25%' };
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
      chartSize: CHART_SIZE_MEDIUM,
      colors: {},
    },
  };
}
