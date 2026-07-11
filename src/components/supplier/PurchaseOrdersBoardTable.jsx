import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrdersBoardRows from './PurchaseOrdersBoardRows';
import PurchaseOrdersBoardHeaderRow from './PurchaseOrdersBoardHeaderRow';
import { usePurchaseOrderBoardView } from '../../hooks/usePurchaseOrderBoardView';
import { usePurchaseOrdersBoardExpansion } from '../../hooks/usePurchaseOrdersBoardExpansion';
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
  headerColumnTextStyles = {},
  headerColumnFormatRules = {},
  lineColumnTextStyles = {},
  lineColumnFormatRules = {},
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
  lineTotalColumns = [],
  lineTotalHeaderLinks = [],
  lineValueHeaderLinks = [],
  editingColumnKey,
  onEditingDone,
  reorderingColumns = false,
  selection,
}) {
  const styles = useStyles();
  const wrapperRef = useRef(null);

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

  const {
    collapsedGroups,
    expandedOrders,
    showBoardHeaders,
    showGroupHeaders,
    handleSetExpansion,
    handleToggleBoardHeaders,
    handleToggleGroupHeaders,
    tableActions,
  } = usePurchaseOrdersBoardExpansion({ groupedRows, rows, groupingColumnKey });

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
            showBoardHeaders={showBoardHeaders}
            showGroupHeaders={showGroupHeaders}
            onSetExpansion={handleSetExpansion}
            onToggleBoardHeaders={handleToggleBoardHeaders}
            onToggleGroupHeaders={handleToggleGroupHeaders}
            columns={columns}
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
            filterByColumn={filterByColumn}
            sortState={sortState}
            groupingColumnKey={groupingColumnKey}
            groupingColor={groupingColor}
            setSortDirection={setSortDirection}
            setFilterOperator={setFilterOperator}
            setFilterValue={setFilterValue}
            setFilterSecondaryValue={setFilterSecondaryValue}
            clearColumnFilter={clearColumnFilter}
            setGroupingColumn={setGroupingColumn}
            clearGrouping={clearGrouping}
            setGroupingBarColor={setGroupingBarColor}
            onAddColumnRightOf={onAddColumnRightOf}
            headerColumnTextStyles={headerColumnTextStyles}
            onSaveHeaderColumnTextStyle={onSaveHeaderColumnTextStyle}
            headerColumnFormatRules={headerColumnFormatRules}
            onSaveHeaderColumnFormatRules={onSaveHeaderColumnFormatRules}
            referenceColumns={columns}
          />
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
          headerColumnTextStyles={headerColumnTextStyles}
          headerColumnFormatRules={headerColumnFormatRules}
          lineColumnTextStyles={lineColumnTextStyles}
          lineColumnFormatRules={lineColumnFormatRules}
          onSaveLineColumnWidth={onSaveLineColumnWidth}
          colCount={colCount}
          groupingColumnLabel={groupingColumnLabel}
          groupingColor={groupingColor}
          tableActions={tableActions}
          cellActions={cellActions}
          lineTotalColumns={lineTotalColumns}
          linkedLineTotalByHeaderKey={linkedLineTotalByHeaderKey}
          linkedLineValueByHeaderKey={linkedLineValueByHeaderKey}
          selection={selection}
        />
      </table>
    </div>
  );
}

export default memo(PurchaseOrdersBoardTable);
