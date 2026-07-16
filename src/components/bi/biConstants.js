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

export const COLOR_MODE_SINGLE = 'single';
export const COLOR_MODE_RANDOM = 'random';

export const COLOR_MODE_OPTIONS = [
  { key: COLOR_MODE_SINGLE, label: 'Single color' },
  { key: COLOR_MODE_RANDOM, label: 'Random colors' },
];

export const VALUE_DISPLAY_VALUE = 'value';
export const VALUE_DISPLAY_PERCENT = 'percent';

export const VALUE_DISPLAY_OPTIONS = [
  { key: VALUE_DISPLAY_VALUE, label: 'Values' },
  { key: VALUE_DISPLAY_PERCENT, label: 'Percentages' },
];

export const MEASURE_STYLE_BAR = 'bar';
export const MEASURE_STYLE_LINE = 'line';

export const MEASURE_STYLE_OPTIONS = [
  { key: MEASURE_STYLE_BAR, label: 'Bar' },
  { key: MEASURE_STYLE_LINE, label: 'Line' },
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

export function resolveColorMode(config) {
  return config?.options?.colorMode === COLOR_MODE_SINGLE ? COLOR_MODE_SINGLE : COLOR_MODE_RANDOM;
}

export function resolveSingleColor(config) {
  const options = config?.options || {};
  if (options.singleColor) return options.singleColor;
  const colors = options.colors || {};
  if (colors[SERIES_COLOR_KEY]) return colors[SERIES_COLOR_KEY];
  const firstKey = Object.keys(colors).find((key) => colors[key]);
  if (firstKey) return colors[firstKey];
  return defaultColorForIndex(0);
}

export function resolveValueDisplay(config) {
  return config?.options?.valueDisplay === VALUE_DISPLAY_PERCENT
    ? VALUE_DISPLAY_PERCENT
    : VALUE_DISPLAY_VALUE;
}

/** Bar charts: per-measure bar or line. Line charts: always line. */
export function resolveMeasureStyle(config, measureKey) {
  if (config?.type === 'line') return MEASURE_STYLE_LINE;
  const styles = config?.options?.measureStyles || {};
  return styles[measureKey] === MEASURE_STYLE_LINE ? MEASURE_STYLE_LINE : MEASURE_STYLE_BAR;
}

export function normalizeMeasureStyles(measures, existing = {}) {
  const next = {};
  measures.forEach((key) => {
    next[key] = existing[key] === MEASURE_STYLE_LINE ? MEASURE_STYLE_LINE : MEASURE_STYLE_BAR;
  });
  return next;
}

export function hasLineSeriesInBarChart(config) {
  if (config?.type !== 'bar') return false;
  return resolveMeasures(config).some((key) => resolveMeasureStyle(config, key) === MEASURE_STYLE_LINE);
}

export function resolveChartColor(config, key, index = 0) {
  if (resolveColorMode(config) === COLOR_MODE_SINGLE) {
    return resolveSingleColor(config);
  }
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
  if (type === 'kpi') return 5;
  if (type === 'pie') return 11;
  if (size === CHART_SIZE_WIDE) return 36;
  return 15;
}

export function chartGridStyle(chart) {
  return { gridColumn: `span ${resolveGridSpan(chart)}` };
}

export function stripFlexStyle(chart, charts = []) {
  const list = Array.isArray(charts) ? charts : [];
  const weight = resolveGridSpan(chart);
  const total = list.reduce((sum, entry) => sum + resolveGridSpan(entry), 0) || weight;
  return {
    flex: `${weight} 1 0`,
    minWidth: 0,
    maxWidth: 'none',
    overflow: 'hidden',
  };
}

/** @deprecated Alleen voor backwards compatibility; split view gebruikt stripFlexStyle. */
export function stripCardStyle(chart) {
  const type = resolveChartType(chart);
  const size = resolveChartSize(chart);
  if (size === CHART_SIZE_WIDE) {
    return { flex: '0 0 60%', minWidth: '384px', maxWidth: '60%' };
  }
  if (size === CHART_SIZE_SMALL) {
    return { flex: '0 0 10%', minWidth: '120px', maxWidth: '120px' };
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
      colorMode: COLOR_MODE_RANDOM,
      singleColor: DEFAULT_CHART_COLORS[0],
      valueDisplay: VALUE_DISPLAY_VALUE,
      unit: '',
      measureStyles: {},
    },
  };
}
