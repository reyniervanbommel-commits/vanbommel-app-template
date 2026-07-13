import React, { useCallback, useEffect, useMemo } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrdersSubitemsBodyRows from './PurchaseOrdersSubitemsBodyRows';
import PurchaseOrdersSubitemsHeader from './PurchaseOrdersSubitemsHeader';
import PurchaseOrderLineTotalsRow from './PurchaseOrderLineTotalsRow';
import { calculateLineColumnSum } from '../../utils/purchaseOrderTotals';
import { useColumnReorderDrag } from '../../hooks/useColumnReorderDrag';
import { usePurchaseOrderTableView } from '../../hooks/usePurchaseOrderTableView';
import { resolveLineColumnWidth } from './purchaseOrderColumnWidthUtils';

const useStyles = makeStyles({
  subTable: {
    width: 'max-content',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  subHeaderCell: {
    position: 'relative',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('2px', '8px'),
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textAlign: 'left',
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
    minWidth: 0,
    overflow: 'hidden',
    ...shorthands.gap('6px'),
  },
  headerCellLabel: {
    flexGrow: 1,
    minWidth: 0,
  },
  dragDropCell: { cursor: 'grab' },
  dragSourceCell: { opacity: 0.6 },
  dropBeforeCell: {
    '::before': {
      content: '""',
      position: 'absolute',
      left: '-2px',
      top: '-1px',
      bottom: '-1px',
      width: '4px',
      backgroundColor: tokens.colorStrokeFocus2,
      zIndex: 6,
    },
  },
  dropAfterCell: {
    '::after': {
      content: '""',
      position: 'absolute',
      right: '-2px',
      top: '-1px',
      bottom: '-1px',
      width: '4px',
      backgroundColor: tokens.colorStrokeFocus2,
      zIndex: 6,
    },
  },
  subCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('2px', '8px'),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  empty: {
    ...shorthands.padding('8px'),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  noRowsCell: {
    ...shorthands.padding('8px'),
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  totalsCell: { ...shorthands.borderTop('2px', 'solid', tokens.colorNeutralStroke1), ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2), ...shorthands.padding('4px', '8px'), fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold, backgroundColor: tokens.colorNeutralBackground2 },
});

export default function PurchaseOrdersSubitemsTable({
  rowId,
  order,
  lines,
  columnConfig,
  mutationActions,
  tableSettings,
  tableCallbacks,
}) {
  const {
    columns,
    columnWidths = {},
    columnTextStyles = {},
    columnFormatRules = {},
    headerColumns = [],
    linkedLineTotalByHeaderKey = {},
    linkedLineValueByHeaderKey = {},
  } = columnConfig;
  const {
    onSaveValue,
    onRenameColumn,
    onRemoveColumn,
    onCorrect,
    isAdmin,
    onToggleWriteback,
    onReorderColumn,
    onSaveColumnTextStyle,
    onSaveColumnFormatRules,
    onSetLineColumnTotal,
    onPushLineTotalToHeader,
    onPushLineValuesToHeader,
  } = mutationActions;
  const { reorderBusy = false, summedLineColumnKeys = [] } = tableSettings;
  const { onSaveColumnWidth, onVisibleLinesChange } = tableCallbacks;
  const styles = useStyles();
  const lineColumns = Array.isArray(columns) ? columns : [];
  const lineColumnDrag = useColumnReorderDrag({ onReorder: onReorderColumn, disabled: reorderBusy });
  const effectiveColumnWidths = useMemo(
    () => lineColumns.reduce((acc, column) => {
      acc[column.key] = resolveLineColumnWidth(columnWidths, column.key);
      return acc;
    }, {}),
    [lineColumns, columnWidths]
  );
  const {
    processedItems: processedLines,
    filterByColumn,
    sortState,
    setFilterOperator,
    setFilterValue,
    setFilterSecondaryValue,
    clearColumnFilter,
    applyFilterFromCellValue,
    setSortDirection,
  } = usePurchaseOrderTableView({ items: lines, columns: lineColumns });
  const noop = useCallback(() => {}, []);
  const visibleLines = useMemo(() => (Array.isArray(processedLines) ? processedLines : []), [processedLines]);
  useEffect(() => {
    onVisibleLinesChange?.(visibleLines);
  }, [onVisibleLinesChange, visibleLines]);
  const summedColumnsSet = useMemo(() => new Set(summedLineColumnKeys), [summedLineColumnKeys]);
  const summedValuesByColumn = useMemo(() => lineColumns.reduce((acc, column) => {
    if (summedColumnsSet.has(column.key)) acc[column.key] = calculateLineColumnSum(visibleLines, column.key);
    return acc;
  }, {}), [lineColumns, summedColumnsSet, visibleLines]);
  const lineColumnConnectionTargets = useMemo(() => {
    const headerLabelByKey = new Map(
      (Array.isArray(headerColumns) ? headerColumns : []).map((column) => [column.key, column.label])
    );
    const next = {};
    Object.entries(linkedLineTotalByHeaderKey || {}).forEach(([headerColumnKey, lineColumnKey]) => {
      if (!lineColumnKey) return;
      const headerLabel = headerLabelByKey.get(headerColumnKey) || headerColumnKey;
      next[lineColumnKey] = [...(next[lineColumnKey] || []), `Header column "${headerLabel}" (total)`];
    });
    Object.entries(linkedLineValueByHeaderKey || {}).forEach(([headerColumnKey, meta]) => {
      const lineColumnKey = meta?.lineColumnKey;
      if (!lineColumnKey) return;
      const headerLabel = headerLabelByKey.get(headerColumnKey) || headerColumnKey;
      next[lineColumnKey] = [...(next[lineColumnKey] || []), `Header column "${headerLabel}" (values)`];
    });
    return next;
  }, [headerColumns, linkedLineTotalByHeaderKey, linkedLineValueByHeaderKey]);

  if (!lineColumns.length) return <div className={styles.empty}>Geen regelkolommen geconfigureerd.</div>;

  return (
    <table className={styles.subTable}>
      <colgroup>
        {lineColumns.map((column) => (
          <col key={`${column.key}-width`} style={{ width: `${effectiveColumnWidths[column.key]}px` }} />
        ))}
      </colgroup>
      <PurchaseOrdersSubitemsHeader
        lineColumns={lineColumns}
        columnWidths={effectiveColumnWidths}
        columnTextStyles={columnTextStyles}
        columnFormatRules={columnFormatRules}
        summedColumnsSet={summedColumnsSet}
        lineColumnConnectionTargets={lineColumnConnectionTargets}
        lineColumnDrag={lineColumnDrag}
        tableView={{
          filterByColumn,
          sortState,
          setFilterOperator,
          setFilterValue,
          setFilterSecondaryValue,
          clearColumnFilter,
          setSortDirection,
        }}
        columnActions={{
          isAdmin,
          onToggleWriteback,
          onRenameColumn,
          onRemoveColumn,
          onSaveColumnWidth,
          onSaveColumnTextStyle,
          onSaveColumnFormatRules,
          onSetLineColumnTotal,
          onPushLineTotalToHeader,
          onPushLineValuesToHeader,
          noop,
        }}
        styles={styles}
      />
      <PurchaseOrdersSubitemsBodyRows
        rowId={rowId}
        order={order}
        lineColumns={lineColumns}
        visibleLines={visibleLines}
        cellPresentation={{
          columnWidths: effectiveColumnWidths,
          columnTextStyles,
          columnFormatRules,
        }}
        mutationActions={{ onSaveValue, onCorrect }}
        classNames={{
          subCell: styles.subCell,
          noRowsCell: styles.noRowsCell,
        }}
        cellFilterActions={{
          filterByColumn,
          applyFilterFromCellValue,
          clearColumnFilter,
        }}
      />
      {summedColumnsSet.size ? (
        <PurchaseOrderLineTotalsRow
          rowId={rowId}
          lineColumns={lineColumns}
          summedColumnsSet={summedColumnsSet}
          summedValuesByColumn={summedValuesByColumn}
          totalsCellClassName={styles.totalsCell}
        />
      ) : null}
    </table>
  );
}
