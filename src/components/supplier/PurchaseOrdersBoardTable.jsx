import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrdersBoardRows from './PurchaseOrdersBoardRows';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';
import PurchaseOrdersTableControls from './PurchaseOrdersTableControls';
import PurchaseOrderColumnFilterMenu, { isColumnFilterActive } from './PurchaseOrderColumnFilterMenu';
import ResizableTableHeaderCell from './ResizableTableHeaderCell';
import { usePurchaseOrderBoardView } from '../../hooks/usePurchaseOrderBoardView';
import { useColumnReorderDrag } from '../../hooks/useColumnReorderDrag';

const useStyles = makeStyles({
  wrapper: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    height: '100%',
    minHeight: 0,
    overflow: 'auto',
    overflowX: 'scroll',
    scrollbarGutter: 'stable',
  },
  table: {
    width: 'max-content',
    borderCollapse: 'collapse',
    minWidth: '100%',
  },
  headerCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    position: 'sticky',
    top: 0,
    zIndex: 2,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('10px', '12px'),
    textAlign: 'left',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'nowrap',
  },
  dragDropCell: { cursor: 'grab' },
  dragSourceCell: { opacity: 0.6 },
  dropBeforeCell: { '::before': { content: '""', position: 'absolute', left: '-2px', top: '-1px', bottom: '-1px', width: '4px', backgroundColor: tokens.colorStrokeFocus2, zIndex: 6 } },
  dropAfterCell: { '::after': { content: '""', position: 'absolute', right: '-2px', top: '-1px', bottom: '-1px', width: '4px', backgroundColor: tokens.colorStrokeFocus2, zIndex: 6 } },
  headerCellContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('6px'),
  },
  headerCellLabel: {
    flexGrow: 1,
    minWidth: 0,
  },
  empty: {
    ...shorthands.padding('16px'),
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
});

function PurchaseOrdersBoardTable({
  items,
  columns,
  lineColumns,
  boardView,
  onSaveValue,
  onRenameColumn,
  onRemoveColumn,
  onCorrect,
  isAdmin,
  onToggleWriteback,
  onReorderHeaderColumn,
  onReorderLineColumn,
  headerColumnWidths = {},
  lineColumnWidths = {},
  onSaveHeaderColumnWidth,
  onSaveLineColumnWidth,
  onAddColumnRightOf,
  editingColumnKey,
  onEditingDone,
  reorderingColumns = false,
  selection,
}) {
  const styles = useStyles();
  const wrapperRef = useRef(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [expandedOrders, setExpandedOrders] = useState({});
  const [showBoardHeaders, setShowBoardHeaders] = useState(true);
  const [showGroupHeaders, setShowGroupHeaders] = useState(true);

  // Scroll gericht naar een net-aangemaakte kolom zodra hij op zijn definitieve plek
  // staat (na het async herladen + verplaatsen). De debounce zorgt dat alleen de
  // laatste positie telt, zodat de tabel niet eerst naar het eind springt.
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
  const fallbackBoardView = usePurchaseOrderBoardView({ items, columns });
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
    setSortDirection,
    groupedRows,
    groupingColumnKey,
    groupingColumnLabel,
    groupingColor,
    setGroupingColumn,
    clearGrouping,
    setGroupingBarColor,
  } = resolvedBoardView;

  const allOrderRowsWithLines = useMemo(
    () =>
      rows
        .filter(({ order }) => Array.isArray(order.lines) && order.lines.length > 0)
        .map(({ rowId }) => rowId),
    [rows]
  );

  useEffect(() => {
    setExpandedOrders((prev) => {
      const next = { ...prev };
      rows.forEach(({ rowId, order }) => {
        if (typeof next[rowId] === 'undefined') {
          next[rowId] = false;
        }
      });
      Object.keys(next).forEach((rowId) => {
        if (!rows.some((row) => row.rowId === rowId)) delete next[rowId];
      });
      return next;
    });
  }, [rows]);

  useEffect(() => {
    setCollapsedGroups({});
  }, [groupingColumnKey]);

  const handleToggleGroup = useCallback((event) => {
    const groupName = event.currentTarget.dataset.group || '';
    if (!groupName) return;
    setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  }, []);

  const handleToggleOrder = useCallback((event) => {
    const rowId = event.currentTarget.dataset.rowid || '';
    if (!rowId) return;
    setExpandedOrders((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  }, []);

  const handleSetAllBoardsExpanded = useCallback((shouldExpand) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev };
      groupedRows.forEach((group) => {
        next[group.groupName] = !shouldExpand;
      });
      return next;
    });
  }, [groupedRows]);

  const handleSetAllGroupsExpanded = useCallback((shouldExpand) => {
    setExpandedOrders((prev) => {
      const next = { ...prev };
      allOrderRowsWithLines.forEach((rowId) => {
        next[rowId] = shouldExpand;
      });
      return next;
    });
  }, [allOrderRowsWithLines]);

  const handleSetExpansion = useCallback((scope, shouldExpand) => {
    if (scope === 'all' || scope === 'boards') {
      handleSetAllBoardsExpanded(shouldExpand);
    }
    if (scope === 'all' || scope === 'groups') {
      handleSetAllGroupsExpanded(shouldExpand);
    }
  }, [handleSetAllBoardsExpanded, handleSetAllGroupsExpanded]);

  const handleToggleBoardHeaders = useCallback(() => {
    setShowBoardHeaders((prev) => !prev);
  }, []);

  const handleToggleGroupHeaders = useCallback(() => {
    setShowGroupHeaders((prev) => !prev);
  }, []);

  const tableActions = useMemo(
    () => ({
      onToggleGroup: handleToggleGroup,
      onToggleOrder: handleToggleOrder,
    }),
    [handleToggleGroup, handleToggleOrder]
  );

  const cellActions = useMemo(
    () => ({
      onSaveValue,
      onRenameColumn,
      onRemoveColumn,
      onCorrect,
      isAdmin,
      onToggleWriteback,
      onReorderLineColumn,
      reorderingColumns,
    }),
    [onSaveValue, onRenameColumn, onRemoveColumn, onCorrect, isAdmin, onToggleWriteback, onReorderLineColumn, reorderingColumns]
  );

  if (!items.length) {
    return <div className={styles.empty}>Geen gegevens gevonden</div>;
  }
  if (!processedItems.length) {
    return <div className={styles.empty}>No rows match the active filters</div>;
  }

  const colCount = columns.length + 1;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <table className={styles.table}>
        <thead>
          <tr>
            <PurchaseOrdersTableControls
              showBoardHeaders={showBoardHeaders}
              showGroupHeaders={showGroupHeaders}
              onSetExpansion={handleSetExpansion}
              onToggleBoardHeaders={handleToggleBoardHeaders}
              onToggleGroupHeaders={handleToggleGroupHeaders}
              selectionEnabled={Boolean(selection?.enabled)}
              allSelected={Boolean(selection?.allSelected)}
              someSelected={Boolean(selection?.someSelected)}
              onToggleAll={selection?.onToggleAll}
            />
            {columns.map((column) => {
              const hasActiveFilter = isColumnFilterActive(column, filterByColumn[column.key]);
              return (
              <ResizableTableHeaderCell
                key={column.key}
                columnKey={column.key}
                data-col-key={column.key}
                width={headerColumnWidths[column.key]}
                className={[styles.headerCell, headerColumnDrag.canDrag ? styles.dragDropCell : '', headerColumnDrag.draggingKey === column.key ? styles.dragSourceCell : '', headerColumnDrag.dropTargetKey === column.key && headerColumnDrag.dropTargetPosition === 'before' ? styles.dropBeforeCell : '', headerColumnDrag.dropTargetKey === column.key && headerColumnDrag.dropTargetPosition === 'after' ? styles.dropAfterCell : ''].filter(Boolean).join(' ')}
                onResizeEnd={onSaveHeaderColumnWidth}
                {...headerColumnDrag.getCellDragProps(column.key)}
              >
                <div className={styles.headerCellContent}>
                  <div className={styles.headerCellLabel}>
                    <PurchaseOrderColumnHeader
                      column={column}
                      onRename={onRenameColumn}
                      onRemove={onRemoveColumn}
                      isAdmin={isAdmin}
                      onToggleWriteback={onToggleWriteback}
                      showActionsMenu={false}
                      autoEdit={editingColumnKey === column.key}
                      onEditingDone={onEditingDone}
                      showFilterIndicator={hasActiveFilter}
                    />
                  </div>
                  <PurchaseOrderColumnFilterMenu
                    column={column}
                    filter={filterByColumn[column.key]}
                    sortState={sortState}
                    groupingColumnKey={groupingColumnKey}
                    groupingColor={groupingColor}
                    isAdmin={isAdmin}
                    onToggleWriteback={onToggleWriteback}
                    onSetSortDirection={setSortDirection}
                    onSetOperator={setFilterOperator}
                    onSetValue={setFilterValue}
                    onSetSecondaryValue={setFilterSecondaryValue}
                    onClearFilter={clearColumnFilter}
                    onSetGroupingColumn={setGroupingColumn}
                    onClearGrouping={clearGrouping}
                    onSetGroupingColor={setGroupingBarColor}
                    onAddColumnRightOf={onAddColumnRightOf}
                    onRemoveColumn={onRemoveColumn}
                  />
                </div>
              </ResizableTableHeaderCell>
              );
            })}
          </tr>
        </thead>
        <PurchaseOrdersBoardRows
          groupedRows={groupedRows}
          collapsedGroups={collapsedGroups}
          expandedOrders={expandedOrders}
          showBoardHeaders={showBoardHeaders}
          showGroupHeaders={showGroupHeaders}
          columns={columns}
          lineColumns={lineColumns}
          headerColumnWidths={headerColumnWidths}
          lineColumnWidths={lineColumnWidths}
          onSaveLineColumnWidth={onSaveLineColumnWidth}
          colCount={colCount}
          groupingColumnLabel={groupingColumnLabel}
          groupingColor={groupingColor}
          tableActions={tableActions}
          cellActions={cellActions}
          selection={selection}
        />
      </table>
    </div>
  );
}

export default memo(PurchaseOrdersBoardTable);
