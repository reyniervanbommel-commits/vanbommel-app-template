// Gedeelde constants voor de BI-feature (#AB:218). Labels in het Engels conform projectrichting.

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
  { key: 'none', label: 'No grouping' },
  { key: 'day', label: 'Per day' },
  { key: 'month', label: 'Per month' },
  { key: 'year', label: 'Per year' },
];

export const VISIBILITY_OPTIONS = [
  { key: 'private', label: 'Private' },
  { key: 'shared', label: 'Shared' },
];

export function createEmptyChartConfig() {
  return {
    type: 'bar',
    dimension: '',
    measure: '',
    aggregation: 'sum',
    dateGrouping: 'none',
    filters: [],
    options: {},
  };
}
