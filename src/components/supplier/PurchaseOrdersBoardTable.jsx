import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import PurchaseOrderCellContextMenu from './PurchaseOrderCellContextMenu';
import PurchaseOrdersBoardRows from './PurchaseOrdersBoardRows';
import PurchaseOrdersBoardHeaderRow from './PurchaseOrdersBoardHeaderRow';
import { usePurchaseOrdersBoardTableStyles } from './purchaseOrdersBoardTableStyles';
import { usePurchaseOrderBoardView } from '../../hooks/usePurchaseOrderBoardView';
import { usePurchaseOrdersBoardExpansion } from '../../hooks/usePurchaseOrdersBoardExpansion';
import { useColumnReorderDrag } from '../../hooks/useColumnReorderDrag';
import { usePurchaseOrdersBoardLinks } from '../../hooks/usePurchaseOrdersBoardLinks';
import { usePurchaseOrdersBoardStickyColumns } from '../../hooks/usePurchaseOrdersBoardStickyColumns';
function PurchaseOrdersBoardTable({
  data,
  layout,
  formatting,
  cellActions: pageCellActions,
  columnActions,
  linkActions,
  selection,
  remarks,
}) {
  const { items, columns, lineColumns, boardView } = data;
  const {
    headerColumnWidths = {},
    stickyColumns = {},
  } = layout;
  const {
    headerColumnTextStyles = {},
    headerColumnFormatRules = {},
    lineColumnTextStyles = {},
    lineColumnFormatRules = {},
  } = formatting;
  const {
    onRenameColumn,
    onRemoveColumn,
    isAdmin,
    onToggleWriteback,
    onReorderHeaderColumn,
    onReorderLineColumn,
    onSaveHeaderColumnWidth,
    onSaveLineColumnWidth,
    onSaveHeaderColumnTextStyle,
    onSaveHeaderColumnFormatRules,
    onSaveLineColumnTextStyle,
    onSaveLineColumnFormatRules,
    onAddColumnRightOf,
    editingColumnKey,
    onEditingDone,
    reorderingColumns = false,
  } = columnActions;
  const {
    onSetLineColumnTotal,
    onPushLineTotalToHeader,
    onPushLineValuesToHeader,
    lineTotalColumns = [],
    lineTotalHeaderLinks = [],
    lineValueHeaderLinks = [],
  } = linkActions;
  const styles = usePurchaseOrdersBoardTableStyles();
  const { wrapperRef, decoratedColumns, stickyColumnKeys, firstNonStickyColumnKey, makeColumnSticky } = usePurchaseOrdersBoardStickyColumns({
    columns,
    headerColumnWidths,
    stickyColumnKeys: stickyColumns.keys,
    onStickyColumnKeysChange: stickyColumns.onChange,
  });
  useEffect(() => {
    if (!editingColumnKey) return undefined;
    const timer = setTimeout(() => {
      const container = wrapperRef.current;
      if (!container) return;
      const cell = container.querySelector(`[data-col-key="${editingColumnKey}"]`);
      if (cell && typeof cell.scrollIntoView === 'function') {
        cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 240);
    return () => clearTimeout(timer);
  }, [editingColumnKey, columns]);
  const fallbackBoardView = usePurchaseOrderBoardView({ items, columns: decoratedColumns });
  const resolvedBoardView = boardView || fallbackBoardView;
  const headerColumnDrag = useColumnReorderDrag({ onReorder: onReorderHeaderColumn, disabled: reorderingColumns });
  const {
    processedItems,
    rows,
    sortState,
    filterByColumn,
    setFilterOperator,
    setFilterValue,
    setFilterSecondaryValue,
    clearColumnFilter,
    applyFilterFromCellValue,
    setSortDirection,
    groupedRows,
    groupingColumnKey,
    groupingColorsByColumn,
    groupSummaryColumnKeys,
    setGroupingColumn,
    clearGrouping,
    setGroupingBarColor,
    setGroupSummaryColumn,
  } = resolvedBoardView;
  const {
    collapsedGroups,
    expandedOrders,
    handleSetExpansion,
    tableActions,
  } = usePurchaseOrdersBoardExpansion({ groupedRows, rows, groupingColumnKey });
  const [cellContext, setCellContext] = useState(null);
  const openCellContextMenu = useCallback((target, cell) => {
    setCellContext({ target, ...cell });
  }, []);
  const closeCellContextMenu = useCallback(() => {
    setCellContext(null);
  }, []);
  const contextMenu = useMemo(() => ({
    filterByColumn,
    open: openCellContextMenu,
  }), [filterByColumn, openCellContextMenu]);
  const contextMenuActions = useMemo(() => ({
    applyFilter: applyFilterFromCellValue,
    clearFilter: clearColumnFilter,
    openRemarks: remarks?.open,
    close: closeCellContextMenu,
  }), [applyFilterFromCellValue, clearColumnFilter, closeCellContextMenu, remarks?.open]);
  const cellActions = useMemo(
    () => ({
      ...pageCellActions,
      onRenameColumn,
      onRemoveColumn,
      isAdmin,
      onToggleWriteback,
      onReorderLineColumn,
      onSaveLineColumnTextStyle,
      onSaveLineColumnFormatRules,
      reorderingColumns,
      lineTotalColumns,
      onSetLineColumnTotal,
      onPushLineTotalToHeader,
      onPushLineValuesToHeader,
    }),
    [columnActions, linkActions, pageCellActions]
  );
  const {
    linkedLineTotalByHeaderKey,
    linkedLineValueByHeaderKey,
  } = usePurchaseOrdersBoardLinks({
    lineColumns,
    lineTotalHeaderLinks,
    lineValueHeaderLinks,
  });
  const colCount = columns.length + 1;
  const rowsData = useMemo(
    () => ({ groupedRows, collapsedGroups, expandedOrders }),
    [collapsedGroups, expandedOrders, groupedRows]
  );
  const rowsLayout = useMemo(
    () => ({ columns: decoratedColumns, lineColumns, colCount }),
    [colCount, decoratedColumns, lineColumns]
  );
  const rowsActions = useMemo(() => ({
    tableActions,
    onClearGrouping: clearGrouping,
    onSaveLineColumnWidth,
    cellActions,
  }), [cellActions, clearGrouping, onSaveLineColumnWidth, tableActions]);
  const rowsLinks = useMemo(() => ({
    lineTotalColumns,
    linkedLineTotalByHeaderKey,
    linkedLineValueByHeaderKey,
  }), [lineTotalColumns, linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey]);

  if (!items.length) {
    return <div className={styles.empty}>Geen gegevens gevonden</div>;
  }
  if (!processedItems.length) {
    return <div className={styles.empty}>No rows match the active filters</div>;
  }

  return (
    <>
      <div className={styles.wrapper} ref={wrapperRef}>
        <table className={styles.table}>
          <thead>
            <PurchaseOrdersBoardHeaderRow
            styles={styles}
            selection={selection}
            onSetExpansion={handleSetExpansion}
            columns={decoratedColumns}
            headerColumnDrag={headerColumnDrag}
            headerColumnWidths={headerColumnWidths}
            onSaveHeaderColumnWidth={onSaveHeaderColumnWidth}
            onRenameColumn={onRenameColumn}
            onRemoveColumn={onRemoveColumn}
            isAdmin={isAdmin}
            onToggleWriteback={onToggleWriteback}
            editingColumnKey={editingColumnKey}
            onEditingDone={onEditingDone}
            linkedLineTotalByHeaderKey={linkedLineTotalByHeaderKey}
            linkedLineValueByHeaderKey={linkedLineValueByHeaderKey}
            lineColumns={lineColumns}
            filterByColumn={filterByColumn}
            sortState={sortState}
            groupingColumnKey={groupingColumnKey}
            groupingColorsByColumn={groupingColorsByColumn}
            groupSummaryColumnKeys={groupSummaryColumnKeys}
            setSortDirection={setSortDirection}
            setFilterOperator={setFilterOperator}
            setFilterValue={setFilterValue}
            setFilterSecondaryValue={setFilterSecondaryValue}
            clearColumnFilter={clearColumnFilter}
            setGroupingColumn={setGroupingColumn}
            clearGrouping={clearGrouping}
            setGroupingBarColor={setGroupingBarColor}
            setGroupSummaryColumn={setGroupSummaryColumn}
            onAddColumnRightOf={onAddColumnRightOf}
            headerColumnTextStyles={headerColumnTextStyles}
            onSaveHeaderColumnTextStyle={onSaveHeaderColumnTextStyle}
            headerColumnFormatRules={headerColumnFormatRules}
            onSaveHeaderColumnFormatRules={onSaveHeaderColumnFormatRules}
            referenceColumns={decoratedColumns}
            stickyColumnKeys={stickyColumnKeys}
            firstNonStickyColumnKey={firstNonStickyColumnKey}
            onMakeColumnSticky={makeColumnSticky}
            />
          </thead>
          <PurchaseOrdersBoardRows
            data={rowsData}
            layout={rowsLayout}
            formatting={formatting}
            actions={rowsActions}
            links={rowsLinks}
            selection={selection}
            contextMenu={contextMenu}
            remarks={remarks}
          />
        </table>
      </div>
      <PurchaseOrderCellContextMenu
        context={cellContext}
        actions={contextMenuActions}
      />
    </>
  );
}
export default memo(PurchaseOrdersBoardTable);
