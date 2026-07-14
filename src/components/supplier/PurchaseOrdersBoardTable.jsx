import React, { memo, useEffect, useMemo } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrdersBoardRows from './PurchaseOrdersBoardRows';
import PurchaseOrdersBoardHeaderRow from './PurchaseOrdersBoardHeaderRow';
import { usePurchaseOrderBoardView } from '../../hooks/usePurchaseOrderBoardView';
import { usePurchaseOrdersBoardExpansion } from '../../hooks/usePurchaseOrdersBoardExpansion';
import { useColumnReorderDrag } from '../../hooks/useColumnReorderDrag';
import { usePurchaseOrdersBoardLineLinks } from '../../hooks/usePurchaseOrdersBoardLineLinks';
import { usePurchaseOrdersBoardStickyColumns } from '../../hooks/usePurchaseOrdersBoardStickyColumns';

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
    borderCollapse: 'separate',
    borderSpacing: 0,
    minWidth: '100%',
    tableLayout: 'fixed',
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
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase300,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    ':hover [data-column-menu-trigger="true"]': {
      opacity: 1,
      pointerEvents: 'auto',
    },
    ':focus-within [data-column-menu-trigger="true"]': {
      opacity: 1,
      pointerEvents: 'auto',
    },
  },
  dragDropCell: { cursor: 'grab' },
  dragSourceCell: { opacity: 0.6 },
  dropBeforeCell: { '::before': { content: '""', position: 'absolute', left: '-2px', top: '-1px', bottom: '-1px', width: '4px', backgroundColor: tokens.colorStrokeFocus2, zIndex: 6 } },
  dropAfterCell: { '::after': { content: '""', position: 'absolute', right: '-2px', top: '-1px', bottom: '-1px', width: '4px', backgroundColor: tokens.colorStrokeFocus2, zIndex: 6 } },
  headerCellContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0, overflow: 'hidden', ...shorthands.gap('6px') },
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
  boardData,
  columnConfig,
  cellActions: boardCellActions,
  columnActions,
  interactionState,
  selection,
}) {
  const { items, columns, lineColumns, boardView } = boardData;
  const {
    headerColumnWidths = {},
    lineColumnWidths = {},
    headerColumnTextStyles = {},
    headerColumnFormatRules = {},
    lineColumnTextStyles = {},
    lineColumnFormatRules = {},
    lineTotalColumns = [],
    lineTotalHeaderLinks = [],
    lineValueHeaderLinks = [],
  } = columnConfig;
  const {
    onSaveValue,
    onCorrect,
    isAdmin,
    onToggleWriteback,
    onReorderHeaderColumn,
    onReorderLineColumn,
  } = boardCellActions;
  const {
    onRenameColumn,
    onRemoveColumn,
    onSaveHeaderColumnWidth,
    onSaveLineColumnWidth,
    onSaveHeaderColumnTextStyle,
    onSaveHeaderColumnFormatRules,
    onSaveLineColumnTextStyle,
    onSaveLineColumnFormatRules,
    onAddColumnRightOf,
    onSetLineColumnTotal,
    onPushLineTotalToHeader,
    onPushLineValuesToHeader,
  } = columnActions;
  const {
    editingColumnKey,
    onEditingDone,
    reorderingColumns = false,
    stickyColumns = {},
  } = interactionState;
  const styles = useStyles();
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

  const cellFilterActions = useMemo(
    () => ({
      filterByColumn,
      applyFilterFromCellValue,
      clearColumnFilter,
    }),
    [filterByColumn, applyFilterFromCellValue, clearColumnFilter]
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
      onSaveLineColumnTextStyle,
      onSaveLineColumnFormatRules,
      reorderingColumns,
      lineTotalColumns,
      onSetLineColumnTotal,
      onPushLineTotalToHeader,
      onPushLineValuesToHeader,
    }),
    [
      onSaveValue,
      onRenameColumn,
      onRemoveColumn,
      onCorrect,
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
    ]
  );

  const { linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey } = usePurchaseOrdersBoardLineLinks({
    lineTotalHeaderLinks,
    lineValueHeaderLinks,
    lineColumns,
  });

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
          boardData={{ groupedRows, collapsedGroups, expandedOrders }}
          columnConfig={{
            columns: decoratedColumns,
            lineColumns,
            headerColumnWidths,
            lineColumnWidths,
            headerColumnTextStyles,
            headerColumnFormatRules,
            lineColumnTextStyles,
            lineColumnFormatRules,
            lineTotalColumns,
            linkedLineTotalByHeaderKey,
            linkedLineValueByHeaderKey,
          }}
          tableConfig={{
            colCount,
            tableActions,
            onClearGrouping: clearGrouping,
            cellActions,
            onSaveLineColumnWidth,
          }}
          selection={selection}
          cellFilterActions={cellFilterActions}
        />
      </table>
    </div>
  );
}
export default memo(PurchaseOrdersBoardTable);
