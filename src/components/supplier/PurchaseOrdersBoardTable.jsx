import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrdersBoardRows from './PurchaseOrdersBoardRows';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';
import PurchaseOrdersTableControls from './PurchaseOrdersTableControls';
import PurchaseOrderColumnFilterMenu from './PurchaseOrderColumnFilterMenu';
import ResizableTableHeaderCell from './ResizableTableHeaderCell';
import { usePurchaseOrderBoardView } from '../../hooks/usePurchaseOrderBoardView';

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
    ':hover [data-column-menu-trigger="true"]': {
      opacity: 1,
      pointerEvents: 'auto',
    },
    ':focus-within [data-column-menu-trigger="true"]': {
      opacity: 1,
      pointerEvents: 'auto',
    },
  },
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

// AANNAME: De eerste header-kolom (sortOrder) toont de order-identificatie en
// krijgt naast de waarde een "verwijderd in D365"-badge wanneer removedInD365.

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
  reorderingColumns = false,
}) {
  const styles = useStyles();
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [expandedOrders, setExpandedOrders] = useState({});
  const [showBoardHeaders, setShowBoardHeaders] = useState(true);
  const [showGroupHeaders, setShowGroupHeaders] = useState(true);
  const fallbackBoardView = usePurchaseOrderBoardView({ items, columns });
  const resolvedBoardView = boardView || fallbackBoardView;

  // Filter/sort/grouping-state wordt op page-niveau beheerd (usePurchaseOrderBoardView)
  // zodat saved views deze samen met de kolomlayout kunnen serialiseren.
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
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <PurchaseOrdersTableControls
              showBoardHeaders={showBoardHeaders}
              showGroupHeaders={showGroupHeaders}
              onSetExpansion={handleSetExpansion}
              onToggleBoardHeaders={handleToggleBoardHeaders}
              onToggleGroupHeaders={handleToggleGroupHeaders}
            />
            {columns.map((column) => (
              <ResizableTableHeaderCell
                key={column.key}
                columnKey={column.key}
                width={headerColumnWidths[column.key]}
                className={styles.headerCell}
                onResizeEnd={onSaveHeaderColumnWidth}
              >
                <div className={styles.headerCellContent}>
                  <div className={styles.headerCellLabel}>
                    <PurchaseOrderColumnHeader
                      column={column}
                      onRename={onRenameColumn}
                      onRemove={onRemoveColumn}
                      isAdmin={isAdmin}
                      onToggleWriteback={onToggleWriteback}
                      onMoveColumn={onReorderHeaderColumn}
                      reorderBusy={reorderingColumns}
                      showActionsMenu={false}
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
                  />
                </div>
              </ResizableTableHeaderCell>
            ))}
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
        />
      </table>
    </div>
  );
}

export default memo(PurchaseOrdersBoardTable);
