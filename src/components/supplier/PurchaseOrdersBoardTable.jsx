import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PurchaseOrderCellContextMenu from './PurchaseOrderCellContextMenu';
import PurchaseOrdersBoardRows from './PurchaseOrdersBoardRows';
import PurchaseOrdersBoardHeaderRow from './PurchaseOrdersBoardHeaderRow';
import { usePurchaseOrdersBoardTableStyles } from './purchaseOrdersBoardTableStyles';
import { usePurchaseOrderBoardView } from '../../hooks/usePurchaseOrderBoardView';
import { usePurchaseOrdersBoardExpansion } from '../../hooks/usePurchaseOrdersBoardExpansion';
import { useColumnReorderDrag } from '../../hooks/useColumnReorderDrag';
import { usePurchaseOrdersBoardLinks } from '../../hooks/usePurchaseOrdersBoardLinks';
import { usePurchaseOrdersBoardStickyColumns } from '../../hooks/usePurchaseOrdersBoardStickyColumns';
import { usePurchaseOrderRowLocate } from '../../hooks/usePurchaseOrderRowLocate';
import { applyCollapsedColumnWidths } from '../../utils/collapsedColumnUtils';
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
    collapsedHeaderColumnKeys = [],
    collapsedLineColumnKeys = [],
  } = layout;
  const {
    headerColumnTextStyles = {},
    headerColumnFormatRules = {},
    lineColumnTextStyles = {},
    lineColumnFormatRules = {},
    lineColumnWidths = {},
  } = formatting;
  const {
    onRenameColumn,
    onRemoveColumn,
    isAdmin,
    isStaff = true,
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
    datePeriodDisplayModes = {},
    onSetDatePeriodDisplayMode,
    editingColumnKey,
    onEditingDone,
    reorderingColumns = false,
    trackChangesActiveByColumnId = null,
    onToggleHeaderColumnCollapsed,
    onToggleLineColumnCollapsed,
    productImageColumnVisible = true,
    onToggleProductImageColumn,
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
  const effectiveHeaderColumnWidths = useMemo(
    () => applyCollapsedColumnWidths(headerColumnWidths, collapsedHeaderColumnKeys),
    [collapsedHeaderColumnKeys, headerColumnWidths]
  );
  const effectiveLineColumnWidths = useMemo(
    () => applyCollapsedColumnWidths(lineColumnWidths, collapsedLineColumnKeys),
    [collapsedLineColumnKeys, lineColumnWidths]
  );
  const { wrapperRef, decoratedColumns, stickyColumnKeys, firstNonStickyColumnKey, makeColumnSticky } = usePurchaseOrdersBoardStickyColumns({
    columns,
    headerColumnWidths: effectiveHeaderColumnWidths,
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
  const fallbackBoardView = usePurchaseOrderBoardView({
    items,
    columns: decoratedColumns,
    datePeriodDisplayModes,
  });
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
    applyColumnFilter,
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
    ensureGroupsExpanded,
    tableActions,
  } = usePurchaseOrdersBoardExpansion({ groupedRows, rows, groupingColumnKey });
  const highlightedLocateKey = usePurchaseOrderRowLocate({
    groupedRows,
    collapsedGroups,
    ensureGroupsExpanded,
    tableWrapperRef: wrapperRef,
    locateRequest: remarks?.locateRequest,
  });
  const [cellContext, setCellContext] = useState(null);
  const openCellContextMenu = useCallback((target, cell) => {
    setCellContext({ target, ...cell });
  }, []);
  const closeCellContextMenu = useCallback(() => {
    setCellContext(null);
  }, []);
  // filterByColumn verandert bij elke filterwijziging. Als het in dit object zit, hertekent
  // élke cel op het bord mee, terwijl de cellen het alleen nodig hebben op het moment dat het
  // contextmenu opengaat. Daarom via een ref: het object zelf blijft stabiel.
  const filterByColumnRef = useRef(filterByColumn);
  useEffect(() => {
    filterByColumnRef.current = filterByColumn;
  }, [filterByColumn]);
  const contextMenu = useMemo(() => ({
    filterByColumnRef,
    open: openCellContextMenu,
  }), [openCellContextMenu]);
  const contextMenuActions = useMemo(() => ({
    applyFilter: applyFilterFromCellValue,
    clearFilter: clearColumnFilter,
    openRemarks: remarks?.open,
    close: closeCellContextMenu,
  }), [applyFilterFromCellValue, clearColumnFilter, closeCellContextMenu, remarks?.open]);
  const cellActions = useMemo(
    () => ({
      ...pageCellActions,
      datePeriodDisplayModes,
      onRenameColumn,
      onRemoveColumn,
      isAdmin,
      isStaff,
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
  // locateActive: zolang er een locate-verzoek loopt moeten álle rijen gemount zijn, anders
  // vindt usePurchaseOrderRowLocate de gezochte rij niet in de DOM.
  const locateActive = Boolean(remarks?.locateRequest?.seq);
  const rowsData = useMemo(
    () => ({ groupedRows, collapsedGroups, expandedOrders, highlightedLocateKey, locateActive }),
    [collapsedGroups, expandedOrders, groupedRows, highlightedLocateKey, locateActive]
  );
  const rowsLayout = useMemo(
    () => ({
      columns: decoratedColumns,
      lineColumns,
      colCount,
      collapsedHeaderColumnKeys,
      collapsedLineColumnKeys,
    }),
    [colCount, collapsedHeaderColumnKeys, collapsedLineColumnKeys, decoratedColumns, lineColumns]
  );
  const rowsActions = useMemo(() => ({
    tableActions,
    onClearGrouping: clearGrouping,
    onSaveLineColumnWidth,
    cellActions,
    onToggleHeaderColumnCollapsed,
    onToggleLineColumnCollapsed,
  }), [cellActions, clearGrouping, onSaveLineColumnWidth, onToggleHeaderColumnCollapsed, onToggleLineColumnCollapsed, tableActions]);
  const rowsLinks = useMemo(() => ({
    lineTotalColumns,
    linkedLineTotalByHeaderKey,
    linkedLineValueByHeaderKey,
  }), [lineTotalColumns, linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey]);

  if (!items.length) {
    return <div className={styles.empty}>No data found</div>;
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
            productImageColumnVisible={productImageColumnVisible}
            onToggleProductImageColumn={onToggleProductImageColumn}
            columns={decoratedColumns}
            headerColumnDrag={headerColumnDrag}
            headerColumnWidths={effectiveHeaderColumnWidths}
            onSaveHeaderColumnWidth={onSaveHeaderColumnWidth}
            onRenameColumn={onRenameColumn}
            onRemoveColumn={onRemoveColumn}
            isAdmin={isAdmin}
            isStaff={isStaff}
            onToggleWriteback={onToggleWriteback}
            trackChangesActiveByColumnId={trackChangesActiveByColumnId}
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
            applyColumnFilter={applyColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setGroupingColumn={setGroupingColumn}
            clearGrouping={clearGrouping}
            setGroupingBarColor={setGroupingBarColor}
            setGroupSummaryColumn={setGroupSummaryColumn}
            onAddColumnRightOf={onAddColumnRightOf}
            datePeriodDisplayModes={datePeriodDisplayModes}
            onSetDatePeriodDisplayMode={onSetDatePeriodDisplayMode}
            headerColumnTextStyles={headerColumnTextStyles}
            onSaveHeaderColumnTextStyle={onSaveHeaderColumnTextStyle}
            headerColumnFormatRules={headerColumnFormatRules}
            onSaveHeaderColumnFormatRules={onSaveHeaderColumnFormatRules}
            referenceColumns={decoratedColumns}
            stickyColumnKeys={stickyColumnKeys}
            firstNonStickyColumnKey={firstNonStickyColumnKey}
            onMakeColumnSticky={makeColumnSticky}
            collapsedColumnKeys={collapsedHeaderColumnKeys}
            onToggleColumnCollapsed={onToggleHeaderColumnCollapsed}
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
