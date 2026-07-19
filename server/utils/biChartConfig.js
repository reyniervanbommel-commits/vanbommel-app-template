'use strict';

const { AGGREGATIONS, CHART_TYPES, DATE_GROUPINGS } = require('./biAggregate');
const { STATUS_COLOR_PALETTE } = require('./statusColumnOptions');

const SELECTABLE_CHART_COLORS = new Set(STATUS_COLOR_PALETTE.slice(1).map((c) => c.toLowerCase()));
const CHART_SIZES = new Set(['small', 'medium', 'wide']);
const GRID_SPANS = new Set([1, 2, 3]);
const COLOR_MODES = new Set(['single', 'random']);
const VALUE_DISPLAYS = new Set(['value', 'percent']);
const MEASURE_STYLES = new Set(['bar', 'line']);

function normalizeColor(value) {
  const color = String(value || '').toLowerCase();
  return SELECTABLE_CHART_COLORS.has(color) ? color : null;
}

function normalizeOptions(rawOptions, chartType) {
  const input = rawOptions && typeof rawOptions === 'object' ? rawOptions : {};
  let chartSize = CHART_SIZES.has(input.chartSize) ? input.chartSize : null;
  if (!chartSize) {
    const gridSpan = GRID_SPANS.has(Number(input.gridSpan)) ? Number(input.gridSpan) : 1;
    if (gridSpan >= 3) chartSize = 'wide';
    else if (gridSpan >= 2) chartSize = 'medium';
    else chartSize = 'medium';
  }

  const colors = {};
  if (input.colors && typeof input.colors === 'object') {
    Object.entries(input.colors).forEach(([key, value]) => {
      const color = normalizeColor(value);
      if (color) colors[String(key).slice(0, 128)] = color;
    });
  }

  const colorMode = COLOR_MODES.has(input.colorMode) ? input.colorMode : 'random';
  const singleColor = normalizeColor(input.singleColor) || undefined;
  const valueDisplay = VALUE_DISPLAYS.has(input.valueDisplay) ? input.valueDisplay : 'value';
  const unit = String(input.unit || '').slice(0, 32);

  const measureStyles = {};
  if (chartType === 'bar' && input.measureStyles && typeof input.measureStyles === 'object') {
    Object.entries(input.measureStyles).forEach(([key, style]) => {
      const normalizedStyle = MEASURE_STYLES.has(style) ? style : 'bar';
      measureStyles[String(key).slice(0, 128)] = normalizedStyle;
    });
  }

  const options = {
    chartSize,
    colors,
    colorMode,
    valueDisplay,
    unit,
    measureStyles,
  };
  if (singleColor) options.singleColor = singleColor;
  return options;
}

function normalizeChartType(rawType) {
  const candidate = String(rawType || '').trim().toLowerCase();
  return CHART_TYPES.includes(candidate) ? candidate : 'bar';
}

function normalizeConfig(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const type = normalizeChartType(input.type);
  const aggregation = AGGREGATIONS.includes(input.aggregation) ? input.aggregation : 'sum';
  const dateGrouping = DATE_GROUPINGS.includes(input.dateGrouping) ? input.dateGrouping : 'none';
  const filters = Array.isArray(input.filters)
    ? input.filters.slice(0, 20).map((f) => ({
      columnKey: String(f?.columnKey || '').slice(0, 128),
      operator: String(f?.operator || '').slice(0, 32),
      value: String(f?.value === null || f?.value === undefined ? '' : f.value).slice(0, 200),
      secondaryValue: String(f?.secondaryValue === null || f?.secondaryValue === undefined ? '' : f.secondaryValue).slice(0, 200),
    })).filter((f) => f.columnKey && f.operator)
    : [];
  const measures = Array.isArray(input.measures)
    ? input.measures.slice(0, 5).map((m) => String(m || '').slice(0, 128)).filter(Boolean)
    : [];
  const measure = String(input.measure || '').slice(0, 128);
  const resolvedMeasures = measures.length ? measures : (measure ? [measure] : []);
  const options = normalizeOptions(input.options, type);

  if (type === 'kpi') options.chartSize = 'small';
  else if (type === 'pie') options.chartSize = 'medium';
  else if (type === 'bar' || type === 'line') {
    if (options.chartSize !== 'wide') options.chartSize = 'medium';
  }

  if (type !== 'bar') options.measureStyles = {};

  return {
    type,
    dimension: String(input.dimension || '').slice(0, 128),
    measure: resolvedMeasures[0] || measure,
    measures: resolvedMeasures,
    aggregation,
    dateGrouping,
    filters,
    options,
  };
}

module.exports = {
  normalizeConfig,
  normalizeOptions,
  normalizeChartType,
};
