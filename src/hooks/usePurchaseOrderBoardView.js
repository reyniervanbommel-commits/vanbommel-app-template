import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePurchaseOrderTableView } from './usePurchaseOrderTableView';
import { usePurchaseOrderGrouping } from './usePurchaseOrderGrouping';
import { usePurchaseOrderColumnSums } from './usePurchaseOrderColumnSums';
import { formatLinkedLineValues } from '../utils/purchaseOrderTotals';
import {
  isDatePeriodColumn,
  normalizeDatePeriodDisplayMode,
  resolveDatePeriodCellValue,
  resolveDatePeriodSourceKey,
} from '../utils/datePeriodColumnUtils';
import {
  ACTIVITY_FILTER_ALL,
  ACTIVITY_FILTER_CHANGED,
  ACTIVITY_FILTER_NEW,
  ACTIVITY_FILTER_REMOVED,
  ACTIVITY_FILTERS,
} from './purchaseOrderActivityFilter';

/**
 * Compositiepunt: filter/sort + grouping + column sums, met één export/apply voor saved views.
 */
export function usePurchaseOrderBoardView({
  items,
  columns,
  lineColumns = [],
  lineTotalHeaderLinks = [],
  lineValueHeaderLinks = [],
  datePeriodDisplayModes = {},
  columnFormatRules = {},
}) {
  const [activityFilter, setActivityFilter] = useState(ACTIVITY_FILTER_ALL);
  const linkedLineTotalByHeaderKey = useMemo(
    () => (Array.isArray(lineTotalHeaderLinks)
      ? lineTotalHeaderLinks.reduce((acc, link) => {
        if (!link?.headerColumnKey || !link?.lineColumnKey) return acc;
        acc[link.headerColumnKey] = link.lineColumnKey;
        return acc;
      }, {})
      : {}),
    [lineTotalHeaderLinks]
  );

  const linkedLineValueByHeaderKey = useMemo(
    () => (Array.isArray(lineValueHeaderLinks)
      ? lineValueHeaderLinks.reduce((acc, link) => {
        if (!link?.headerColumnKey || !link?.lineColumnKey) return acc;
        const lineColumn = lineColumns.find((column) => column.key === link.lineColumnKey);
        acc[link.headerColumnKey] = {
          lineColumnKey: link.lineColumnKey,
          lineDataType: lineColumn?.dataType || 'text',
          lineColumnLabel: lineColumn?.label || '',
        };
        return acc;
      }, {})
      : {}),
    [lineValueHeaderLinks, lineColumns]
  );

  // De totalen zet de server al in values (calculateLinkedLineTotal ≡ calculateLineColumnSum);
  // alleen de value-links moeten hier nog geformatteerd worden, uit de ruwe regelwaarden die
  // met de rollup meekomen. De sublijnen zelf zitten niet in de board-payload.
  const itemsWithLinkedValues = useMemo(() => {
    const linkedValueKeys = Object.keys(linkedLineValueByHeaderKey);
    if (!linkedValueKeys.length) return items;

    return items.map((order) => {
      let nextValues = order?.values || {};
      let changed = false;

      linkedValueKeys.forEach((headerKey) => {
        const meta = linkedLineValueByHeaderKey[headerKey];
        if (!meta?.lineColumnKey) return;
        const rawValues = order?.linkedLineValues?.[headerKey]
          ?? (Array.isArray(order?.lines)
            ? order.lines.map((line) => line?.values?.[meta.lineColumnKey])
            : null);
        const sourceValues = Array.isArray(rawValues)
          ? rawValues
          : (nextValues?.[headerKey] != null && nextValues[headerKey] !== ''
            ? String(nextValues[headerKey]).split(',').map((part) => part.trim()).filter(Boolean)
            : null);
        if (!Array.isArray(sourceValues)) return;
        const nextValue = formatLinkedLineValues(
          sourceValues,
          meta.lineDataType,
          { columnKey: meta.lineColumnKey, columnLabel: meta.lineColumnLabel },
        );
        if (nextValues?.[headerKey] === nextValue) return;
        if (!changed) nextValues = { ...nextValues };
        nextValues[headerKey] = nextValue;
        changed = true;
      });

      if (!changed) return order;
      return { ...order, values: nextValues };
    });
  }, [items, linkedLineValueByHeaderKey]);

  const datePeriodColumns = useMemo(
    () => (Array.isArray(columns) ? columns : []).filter(isDatePeriodColumn),
    [columns]
  );

  const itemsWithDerivedDatePeriods = useMemo(() => {
    if (!datePeriodColumns.length) return itemsWithLinkedValues;

    return itemsWithLinkedValues.map((order) => {
      let nextValues = order?.values || {};
      let changed = false;

      datePeriodColumns.forEach((column) => {
        const sourceKey = resolveDatePeriodSourceKey(column);
        if (!sourceKey) return;
        const displayMode = normalizeDatePeriodDisplayMode(datePeriodDisplayModes[column.key]);
        const derived = resolveDatePeriodCellValue(column, nextValues, displayMode) || null;
        if (nextValues[column.key] === derived) return;
        if (!changed) {
          nextValues = { ...nextValues };
          changed = true;
        }
        nextValues[column.key] = derived;
      });

      if (!changed) return order;
      return { ...order, values: nextValues };
    });
  }, [datePeriodColumns, datePeriodDisplayModes, itemsWithLinkedValues]);

  // De regel-vlaggen komen als rollup uit de board-read (hasNewLine/hasChangedLine/
  // hasRemovedLine); de sublijnen zelf zijn hier niet beschikbaar.
  const hasNewData = useCallback((order) => (
    Boolean(order?.isNew) || Boolean(order?.hasNewLine)
  ), []);

  const hasRemovedData = useCallback((order) => (
    Boolean(order?.hasRemovalChange) || Boolean(order?.hasRemovedLine)
  ), []);

  const hasChangedData = useCallback((order) => {
    if (hasNewData(order)) return false;
    const headerCellChanged = Array.isArray(order?.changedFieldKeys) && order.changedFieldKeys.length > 0;
    const orderChanged = Boolean(order?.isChanged) || headerCellChanged;
    return orderChanged || Boolean(order?.hasChangedLine);
  }, [hasNewData]);

  const matchesActivityFilter = useCallback((order) => {
    if (activityFilter === ACTIVITY_FILTER_NEW) return hasNewData(order);
    if (activityFilter === ACTIVITY_FILTER_CHANGED) return hasChangedData(order);
    if (activityFilter === ACTIVITY_FILTER_REMOVED) return hasRemovedData(order);
    return true;
  }, [activityFilter, hasChangedData, hasNewData, hasRemovedData]);

  const activityCounts = useMemo(() => itemsWithDerivedDatePeriods.reduce((acc, order) => {
    if (hasNewData(order)) acc.newCount += 1;
    if (hasChangedData(order)) acc.changedCount += 1;
    if (hasRemovedData(order)) acc.removedCount += 1;
    return acc;
  }, { newCount: 0, changedCount: 0, removedCount: 0 }), [itemsWithDerivedDatePeriods, hasChangedData, hasNewData, hasRemovedData]);

  const toggleActivityFilter = useCallback((nextFilter) => {
    setActivityFilter((prev) => (prev === nextFilter ? ACTIVITY_FILTER_ALL : nextFilter));
  }, []);

  // Na "Mark as seen" of een D365-refresh verdwijnen new/changed/removed-flags, maar het
  // activity-filter kan nog actief zijn — de activity-bar verdwijnt dan ook, waardoor het
  // bord leeg lijkt ("No rows match the active filters") zonder zichtbare reset-knop.
  useEffect(() => {
    if (activityFilter === ACTIVITY_FILTER_ALL) return;
    const hasMatches = itemsWithDerivedDatePeriods.some(matchesActivityFilter);
    if (!hasMatches) setActivityFilter(ACTIVITY_FILTER_ALL);
  }, [activityFilter, itemsWithDerivedDatePeriods, matchesActivityFilter]);

  const filteredItems = useMemo(
    () => (activityFilter === ACTIVITY_FILTER_ALL ? itemsWithDerivedDatePeriods : itemsWithDerivedDatePeriods.filter(matchesActivityFilter)),
    [activityFilter, itemsWithDerivedDatePeriods, matchesActivityFilter]
  );

  const tableView = usePurchaseOrderTableView({
    items: filteredItems,
    columns,
    datePeriodDisplayModes,
    columnFormatRules,
  });

  const [kpiFilterKey, setKpiFilterKey] = useState(null);
  const [kpiMatchKeys, setKpiMatchKeys] = useState(null);
  const applyKpiFilter = useCallback((key, matchKeys, options = {}) => {
    const shouldToggle = options.toggle !== false;
    setKpiFilterKey((prev) => {
      if (shouldToggle && prev === key) {
        setKpiMatchKeys(null);
        return null;
      }
      setKpiMatchKeys(matchKeys || null);
      return key;
    });
  }, []);
  const clearAllFilters = useCallback(() => {
    setKpiFilterKey(null);
    setKpiMatchKeys(null);
    tableView.clearAllFilters();
  }, [tableView]);

  const displayedItems = useMemo(() => {
    if (!kpiMatchKeys) return tableView.processedItems;
    return tableView.processedItems.filter((order) => kpiMatchKeys.has(order.orderNumber));
  }, [kpiMatchKeys, tableView.processedItems]);

  const rows = useMemo(
    () =>
      displayedItems.map((order, index) => ({
        order,
        rowId: order?.orderNumber
          ? `${order.dataAreaId || ''}-${order.orderNumber}-${index}`
          : 'row-' + String(index),
      })),
    [displayedItems]
  );

  const grouping = usePurchaseOrderGrouping({ rows, columns });
  const columnSums = usePurchaseOrderColumnSums({ rows, columns });

  const exportFilterSortGrouping = useCallback(() => {
    const tableState = tableView.exportState();
    return {
      activityFilter,
      filterByColumn: tableState.filterByColumn,
      sortState: tableState.sortState,
      grouping: grouping.exportState(),
      columnSumKeys: columnSums.columnSumKeys,
    };
  }, [activityFilter, columnSums.columnSumKeys, tableView, grouping]);

  const applyFilterSortGrouping = useCallback((state) => {
    setActivityFilter(
      ACTIVITY_FILTERS.includes(state?.activityFilter)
        ? state.activityFilter
        : ACTIVITY_FILTER_ALL
    );
    tableView.applyState({
      filterByColumn: state?.filterByColumn,
      sortState: state?.sortState,
    });
    grouping.applyState(state?.grouping);
    columnSums.applyKeys(state?.columnSumKeys);
  }, [columnSums.applyKeys, grouping, tableView]);

  return useMemo(
    () => ({
      // filter/sort API + processedItems
      processedItems: displayedItems,
      kpiSourceItems: tableView.processedItems,
      kpiFilterKey,
      applyKpiFilter,
      // volledige dataset (alle rijen, afgeleide waarden, zonder filter/sort) voor exports
      allItems: itemsWithDerivedDatePeriods,
      sortState: tableView.sortState,
      filterByColumn: tableView.filterByColumn,
      activeFilterCount: tableView.activeFilterCount,
      hasActiveSort: tableView.hasActiveSort,
      setFilterOperator: tableView.setFilterOperator,
      setFilterValue: tableView.setFilterValue,
      setFilterSecondaryValue: tableView.setFilterSecondaryValue,
      applyColumnFilter: tableView.applyColumnFilter,
      clearColumnFilter: tableView.clearColumnFilter,
      setColumnColorFilter: tableView.setColumnColorFilter,
      applyFilterFromCellValue: tableView.applyFilterFromCellValue,
      clearAllFilters,
      toggleSort: tableView.toggleSort,
      clearSort: tableView.clearSort,
      setSortDirection: tableView.setSortDirection,
      activityFilter,
      toggleActivityFilter,
      activityCounts,
      // afgeleide rijen
      rows,
      // grouping API
      groupedRows: grouping.groupedRows,
      groupingColumnKey: grouping.groupingColumnKey,
      groupingColumnLabel: grouping.groupingColumnLabel,
      groupingColor: grouping.groupingColor,
      groupingColorsByColumn: grouping.groupingColorsByColumn,
      groupSummaryColumnKeys: grouping.summaryColumnKeys,
      setGroupingColumn: grouping.setGroupingColumn,
      clearGrouping: grouping.clearGrouping,
      setGroupingBarColor: grouping.setGroupingBarColor,
      setGroupSummaryColumn: grouping.setGroupSummaryColumn,
      clearGroupSummaries: grouping.clearGroupSummaries,
      columnSums,
      // gecombineerde serialisatie voor saved views
      exportFilterSortGrouping,
      applyFilterSortGrouping,
    }),
    [tableView, displayedItems, kpiFilterKey, applyKpiFilter, clearAllFilters, itemsWithDerivedDatePeriods, activityFilter, toggleActivityFilter, activityCounts, rows, grouping, columnSums, exportFilterSortGrouping, applyFilterSortGrouping]
  );
}
