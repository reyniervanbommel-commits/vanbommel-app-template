import { useCallback, useMemo, useState } from 'react';
import { usePurchaseOrderTableView } from './usePurchaseOrderTableView';
import { usePurchaseOrderGrouping } from './usePurchaseOrderGrouping';
import { calculateLineColumnSum, calculateLineColumnValues } from '../utils/purchaseOrderTotals';

const ACTIVITY_FILTER_ALL = 'all';
const ACTIVITY_FILTER_NEW = 'new';
const ACTIVITY_FILTER_CHANGED = 'changed';
const ACTIVITY_FILTER_REMOVED = 'removed';

/**
 * Compositiepunt voor de board-view state: combineert filter/sort
 * (usePurchaseOrderTableView) met grouping (usePurchaseOrderGrouping) en levert
 * één gecombineerde export/apply zodat een saved view filter + sort + grouping in
 * één keer kan serialiseren en terugzetten. Kolomlayout hoort NIET hier maar in
 * usePurchaseOrdersPage; PurchaseOrdersPage voegt beide samen tot een volledige view.
 */
export function usePurchaseOrderBoardView({
  items,
  columns,
  lineColumns = [],
  lineTotalHeaderLinks = [],
  lineValueHeaderLinks = [],
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
        if (!lineColumn) return acc;
        acc[link.headerColumnKey] = { lineColumnKey: link.lineColumnKey, lineDataType: lineColumn.dataType };
        return acc;
      }, {})
      : {}),
    [lineValueHeaderLinks, lineColumns]
  );

  const itemsWithLinkedValues = useMemo(() => {
    const linkedTotalKeys = Object.keys(linkedLineTotalByHeaderKey);
    const linkedValueKeys = Object.keys(linkedLineValueByHeaderKey);
    if (!linkedTotalKeys.length && !linkedValueKeys.length) return items;

    return items.map((order) => {
      let nextValues = order?.values || {};
      let changed = false;

      linkedTotalKeys.forEach((headerKey) => {
        const lineColumnKey = linkedLineTotalByHeaderKey[headerKey];
        if (!lineColumnKey) return;
        const nextValue = calculateLineColumnSum(order?.lines, lineColumnKey);
        if (nextValues?.[headerKey] === nextValue) return;
        if (!changed) nextValues = { ...nextValues };
        nextValues[headerKey] = nextValue;
        changed = true;
      });

      linkedValueKeys.forEach((headerKey) => {
        const meta = linkedLineValueByHeaderKey[headerKey];
        if (!meta?.lineColumnKey) return;
        const nextValue = calculateLineColumnValues(order?.lines, meta.lineColumnKey, meta.lineDataType);
        if (nextValues?.[headerKey] === nextValue) return;
        if (!changed) nextValues = { ...nextValues };
        nextValues[headerKey] = nextValue;
        changed = true;
      });

      if (!changed) return order;
      return { ...order, values: nextValues };
    });
  }, [items, linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey]);

  const hasNewData = useCallback((order) => (
    Boolean(order?.isNew)
    || (Array.isArray(order?.lines) && order.lines.some((line) => line?.isNew))
  ), []);

  const hasRemovedData = useCallback((order) => (
    Boolean(order?.removedInD365)
    || (Array.isArray(order?.lines) && order.lines.some((line) => line?.isRemoved))
  ), []);

  const hasChangedData = useCallback((order) => {
    if (hasNewData(order)) return false;
    const headerCellChanged = Array.isArray(order?.changedFieldKeys) && order.changedFieldKeys.length > 0;
    const orderChanged = Boolean(order?.isChanged) || headerCellChanged;
    const lineChanged = Array.isArray(order?.lines) && order.lines.some((line) => (
      line?.isChanged || (Array.isArray(line?.changedFieldKeys) && line.changedFieldKeys.length > 0)
    ));
    return orderChanged || lineChanged;
  }, [hasNewData]);

  const matchesActivityFilter = useCallback((order) => {
    if (activityFilter === ACTIVITY_FILTER_NEW) return hasNewData(order);
    if (activityFilter === ACTIVITY_FILTER_CHANGED) return hasChangedData(order);
    if (activityFilter === ACTIVITY_FILTER_REMOVED) return hasRemovedData(order);
    return true;
  }, [activityFilter, hasChangedData, hasNewData, hasRemovedData]);

  const activityCounts = useMemo(() => itemsWithLinkedValues.reduce((acc, order) => {
    if (hasNewData(order)) acc.newCount += 1;
    if (hasChangedData(order)) acc.changedCount += 1;
    if (hasRemovedData(order)) acc.removedCount += 1;
    return acc;
  }, { newCount: 0, changedCount: 0, removedCount: 0 }), [itemsWithLinkedValues, hasChangedData, hasNewData, hasRemovedData]);

  const toggleActivityFilter = useCallback((nextFilter) => {
    setActivityFilter((prev) => (prev === nextFilter ? ACTIVITY_FILTER_ALL : nextFilter));
  }, []);

  const filteredItems = useMemo(
    () => (activityFilter === ACTIVITY_FILTER_ALL ? itemsWithLinkedValues : itemsWithLinkedValues.filter(matchesActivityFilter)),
    [activityFilter, itemsWithLinkedValues, matchesActivityFilter]
  );

  const tableView = usePurchaseOrderTableView({ items: filteredItems, columns });

  const rows = useMemo(
    () =>
      tableView.processedItems.map((order, index) => ({
        order,
        rowId: order?.orderNumber
          ? `${order.dataAreaId || ''}-${order.orderNumber}-${index}`
          : 'row-' + String(index),
      })),
    [tableView.processedItems]
  );

  const grouping = usePurchaseOrderGrouping({ rows, columns });

  const exportFilterSortGrouping = useCallback(() => {
    const tableState = tableView.exportState();
    return {
      filterByColumn: tableState.filterByColumn,
      sortState: tableState.sortState,
      grouping: grouping.exportState(),
    };
  }, [tableView, grouping]);

  const applyFilterSortGrouping = useCallback((state) => {
    tableView.applyState({
      filterByColumn: state?.filterByColumn,
      sortState: state?.sortState,
    });
    grouping.applyState(state?.grouping);
  }, [tableView, grouping]);

  return useMemo(
    () => ({
      // filter/sort API + processedItems
      processedItems: tableView.processedItems,
      sortState: tableView.sortState,
      filterByColumn: tableView.filterByColumn,
      activeFilterCount: tableView.activeFilterCount,
      hasActiveSort: tableView.hasActiveSort,
      setFilterOperator: tableView.setFilterOperator,
      setFilterValue: tableView.setFilterValue,
      setFilterSecondaryValue: tableView.setFilterSecondaryValue,
      clearColumnFilter: tableView.clearColumnFilter,
      applyFilterFromCellValue: tableView.applyFilterFromCellValue,
      clearAllFilters: tableView.clearAllFilters,
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
      setGroupingColumn: grouping.setGroupingColumn,
      clearGrouping: grouping.clearGrouping,
      setGroupingBarColor: grouping.setGroupingBarColor,
      // gecombineerde serialisatie voor saved views
      exportFilterSortGrouping,
      applyFilterSortGrouping,
    }),
    [tableView, activityFilter, toggleActivityFilter, activityCounts, rows, grouping, exportFilterSortGrouping, applyFilterSortGrouping]
  );
}
