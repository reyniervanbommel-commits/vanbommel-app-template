import { useCallback, useMemo } from 'react';
import { usePurchaseOrderTableView } from './usePurchaseOrderTableView';
import { usePurchaseOrderGrouping } from './usePurchaseOrderGrouping';
import { calculateLineColumnSum, calculateLineColumnValues } from '../utils/purchaseOrderTotals';

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

  const tableView = usePurchaseOrderTableView({ items: itemsWithLinkedValues, columns });

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
      clearAllFilters: tableView.clearAllFilters,
      toggleSort: tableView.toggleSort,
      clearSort: tableView.clearSort,
      setSortDirection: tableView.setSortDirection,
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
    [tableView, rows, grouping, exportFilterSortGrouping, applyFilterSortGrouping]
  );
}
