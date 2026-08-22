import { useMemo } from 'react';
import { COLOR_FILTER_OPERATOR } from '../../utils/tableViewFilterUtils';
import { normalizeColumnFormatRuleSet } from './columnFormatRuleUtils';
import {
  isColumnFilterActive,
  isColumnFormatRuleSetActive,
} from './purchaseOrderColumnFilterMenuConstants';

/**
 * @typedef {'header' | 'line'} ActiveRuleScope
 * @typedef {{
 *   id: string,
 *   columnKey: string,
 *   columnLabel: string,
 *   scope: ActiveRuleScope,
 *   column: object,
 *   summary: string,
 *   filter?: object,
 *   ruleSet?: object,
 * }} ActiveRuleItem
 */

function stringifyFilterValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  return String(value ?? '');
}

export function summarizeColumnFilter(column, filter) {
  if (filter?.operator === COLOR_FILTER_OPERATOR) {
    return `${Array.isArray(filter.colors) ? filter.colors.length : 0} colors`;
  }
  if (filter?.operator === 'between') {
    return `${filter.operator} ${stringifyFilterValue(filter.value)} and ${stringifyFilterValue(filter.secondaryValue)}`;
  }
  return `${filter?.operator || ''} ${stringifyFilterValue(filter?.value)}`.trim();
}

export function summarizeFormatRuleSet(ruleSet) {
  const count = normalizeColumnFormatRuleSet(ruleSet)?.rules?.length || 0;
  return `${count} ${count === 1 ? 'rule' : 'rules'}`;
}

function buildActiveItems({
  columns,
  scope,
  sourceByColumn,
  isActive,
  summarize,
  payloadKey,
  datePeriodDisplayModes,
}) {
  return (Array.isArray(columns) ? columns : []).reduce((items, column) => {
    const columnKey = column?.key;
    const source = sourceByColumn?.[columnKey];
    const active = payloadKey === 'filter'
      ? isActive(column, source, datePeriodDisplayModes)
      : isActive(source);
    if (!columnKey || !active) return items;
    items.push({
      id: `${scope}:${columnKey}`,
      columnKey,
      columnLabel: column.label || columnKey,
      scope,
      column,
      summary: summarize(column, source),
      [payloadKey]: source,
    });
    return items;
  }, []);
}

/**
 * Derives active PO board filters and format rules for the overview flyout.
 *
 * @param {{
 *   headerColumns: object[],
 *   lineColumns: object[],
 *   filterByColumn: object,
 *   headerColumnFormatRules: object,
 *   lineColumnFormatRules: object,
 *   datePeriodDisplayModes?: object,
 * }} options
 * @returns {{ hasActive: boolean, filters: { header: ActiveRuleItem[], line: ActiveRuleItem[] }, formatRules: { header: ActiveRuleItem[], line: ActiveRuleItem[] } }}
 */
export function usePurchaseOrdersActiveRules({
  headerColumns = [],
  lineColumns = [],
  filterByColumn = {},
  headerColumnFormatRules = {},
  lineColumnFormatRules = {},
  datePeriodDisplayModes = {},
}) {
  const filters = useMemo(() => ({
    header: buildActiveItems({
      columns: headerColumns,
      scope: 'header',
      sourceByColumn: filterByColumn,
      isActive: isColumnFilterActive,
      summarize: summarizeColumnFilter,
      payloadKey: 'filter',
      datePeriodDisplayModes,
    }),
    line: [],
  }), [datePeriodDisplayModes, filterByColumn, headerColumns]);

  const formatRules = useMemo(() => ({
    header: buildActiveItems({
      columns: headerColumns,
      scope: 'header',
      sourceByColumn: headerColumnFormatRules,
      isActive: isColumnFormatRuleSetActive,
      summarize: (_column, ruleSet) => summarizeFormatRuleSet(ruleSet),
      payloadKey: 'ruleSet',
    }),
    line: buildActiveItems({
      columns: lineColumns,
      scope: 'line',
      sourceByColumn: lineColumnFormatRules,
      isActive: isColumnFormatRuleSetActive,
      summarize: (_column, ruleSet) => summarizeFormatRuleSet(ruleSet),
      payloadKey: 'ruleSet',
    }),
  }), [headerColumnFormatRules, headerColumns, lineColumnFormatRules, lineColumns]);

  const hasActive = useMemo(() => (
    filters.header.length > 0
    || filters.line.length > 0
    || formatRules.header.length > 0
    || formatRules.line.length > 0
  ), [filters, formatRules]);

  return { hasActive, filters, formatRules };
}
