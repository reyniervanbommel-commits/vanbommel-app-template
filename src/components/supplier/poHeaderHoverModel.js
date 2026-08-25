import {
  isDatePeriodColumn,
  normalizeDatePeriodDisplayMode,
} from '../../utils/datePeriodColumnUtils';
import {
  COLOR_FILTER_OPERATOR,
  DATE_FILTER_OPERATORS,
  NUMBER_FILTER_OPERATORS,
  TEXT_FILTER_OPERATORS,
} from '../../utils/tableViewFilterUtils';
import {
  getColumnSourceMeta,
  getColumnTypeMeta,
  isColumnFilterActive,
  isColumnFormatRuleSetActive,
  isDateColumn,
  isNumberColumn,
} from './purchaseOrderColumnFilterMenuConstants';
import { summarizeFormatRuleSet } from './usePurchaseOrdersActiveRules';

function stringifyFilterValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  return String(value ?? '');
}

function getOperatorLabel(column, operator, datePeriodDisplayModes) {
  if (!operator || operator === COLOR_FILTER_OPERATOR) return '';
  if (isDateColumn(column)) return DATE_FILTER_OPERATORS[operator] || operator;
  if (isNumberColumn(column, datePeriodDisplayModes)) return NUMBER_FILTER_OPERATORS[operator] || operator;
  return TEXT_FILTER_OPERATORS[operator] || operator;
}

function formatHoverFilterSummary(column, filter, datePeriodDisplayModes) {
  if (!isColumnFilterActive(column, filter, datePeriodDisplayModes)) return 'None';
  if (filter.operator === COLOR_FILTER_OPERATOR) {
    const count = Array.isArray(filter.colors) ? filter.colors.length : 0;
    return `${count} ${count === 1 ? 'color' : 'colors'}`;
  }
  const operatorLabel = getOperatorLabel(column, filter.operator, datePeriodDisplayModes);
  if (filter.operator === 'between') {
    return `${operatorLabel} ${stringifyFilterValue(filter.value)} and ${stringifyFilterValue(filter.secondaryValue)}`;
  }
  return `${operatorLabel} ${stringifyFilterValue(filter.value)}`.trim();
}

function lineColumnLabel(lineColumns, columnKey) {
  return lineColumns.find((lineColumn) => lineColumn.key === columnKey)?.label || columnKey;
}

export function getPoHeaderConnectionTargets({
  columnKey,
  linkedLineTotalByHeaderKey = {},
  linkedLineValueByHeaderKey = {},
  lineColumns = [],
} = {}) {
  const targets = [];
  const linkedTotalColumnKey = linkedLineTotalByHeaderKey[columnKey];
  if (linkedTotalColumnKey) {
    targets.push(`Subitem column "${lineColumnLabel(lineColumns, linkedTotalColumnKey)}" (total)`);
  }
  const linkedValueMeta = linkedLineValueByHeaderKey[columnKey];
  if (linkedValueMeta?.lineColumnKey) {
    targets.push(`Subitem column "${lineColumnLabel(lineColumns, linkedValueMeta.lineColumnKey)}" (values)`);
  }
  return targets;
}

/**
 * Builds the PO header hover card model from in-memory board state.
 * No row scans and no extra IO.
 *
 * @returns {{ title: string, rows: { label: string, value: string }[] } | null}
 */
export function buildPoHeaderHoverModel({
  column,
  filter,
  sortState,
  groupingColumnKey,
  isGroupSummaryColumn = false,
  formatRuleSet,
  connectionTargets = [],
  datePeriodDisplayMode,
  isSticky = false,
  isConnected = false,
} = {}) {
  if (!column) return null;

  const datePeriodDisplayModes = column.key && datePeriodDisplayMode
    ? { [column.key]: datePeriodDisplayMode }
    : {};
  const sourceMeta = getColumnSourceMeta(column, {
    isConnected,
    hasConnectionTargets: connectionTargets.length > 0,
  });
  const rows = [
    { label: 'Type', value: getColumnTypeMeta(column).label },
    { label: 'Source', value: sourceMeta.label },
    { label: 'Filter', value: formatHoverFilterSummary(column, filter, datePeriodDisplayModes) },
  ];

  if (sortState?.columnKey === column.key && sortState.direction && sortState.direction !== 'none') {
    rows.push({
      label: 'Sort',
      value: sortState.direction === 'desc' ? 'Descending' : 'Ascending',
    });
  }
  if (groupingColumnKey === column.key) {
    rows.push({ label: 'Grouping', value: 'Active' });
  }
  if (isGroupSummaryColumn) {
    rows.push({ label: 'Group total', value: 'Shown in group header' });
  }
  if (isColumnFormatRuleSetActive(formatRuleSet)) {
    rows.push({ label: 'Formatting', value: summarizeFormatRuleSet(formatRuleSet) });
  }
  if (column.writableToD365) {
    rows.push({ label: 'Write-back', value: 'Enabled' });
  }
  if (connectionTargets.length > 0) {
    rows.push({ label: 'Connected to', value: connectionTargets.join('; ') });
  }
  if (isDatePeriodColumn(column)) {
    const mode = normalizeDatePeriodDisplayMode(datePeriodDisplayMode);
    rows.push({ label: 'Date display', value: mode === 'month' ? 'Month' : 'Week' });
  }
  if (isSticky) {
    rows.push({ label: 'Pin', value: 'Sticky' });
  }

  return {
    title: column.label || column.key,
    rows,
  };
}
