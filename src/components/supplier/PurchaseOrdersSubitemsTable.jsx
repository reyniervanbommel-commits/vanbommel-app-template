import React, { useCallback, useMemo } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import PurchaseOrderColumnHeader from './PurchaseOrderColumnHeader';
import PurchaseOrderColumnFilterMenu from './PurchaseOrderColumnFilterMenu';
import PurchaseOrderProductImageColumnHeader from './PurchaseOrderProductImageColumnHeader';
import PurchaseOrdersSubitemsBodyRows from './PurchaseOrdersSubitemsBodyRows';
import PurchaseOrderLineTotalsRow from './PurchaseOrderLineTotalsRow';
import ResizableTableHeaderCell from './ResizableTableHeaderCell';
import { isColumnFilterActive, isColumnFormatRuleSetActive } from './purchaseOrderColumnFilterMenuConstants';
import { calculateLineColumnSum, filterSummableLineColumnKeys } from '../../utils/purchaseOrderTotals';
import { useColumnReorderDrag } from '../../hooks/useColumnReorderDrag';
import { usePurchaseOrderTableView } from '../../hooks/usePurchaseOrderTableView';
import { resolveLineColumnWidth } from './purchaseOrderColumnWidthUtils';
import { isProductImageColumn, PRODUCT_IMAGE_MIN_COLUMN_WIDTH } from '../../utils/purchaseOrderProductImageColumn';
import { useSubitemConnectorStyles } from './purchaseOrderSubitemConnectorStyles';

import { purchaseOrderSubRowHeight } from './purchaseOrderBoardLayout';

const useStyles = makeStyles({
  subitemsLayout: {
    display: 'inline-block',
    position: 'relative',
  },
  subTableCardBackdrop: {
    position: 'absolute',
    left: '22px',
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: '6px',
    boxShadow: tokens.shadow2,
    backgroundColor: tokens.colorNeutralBackground1,
    zIndex: 0,
    pointerEvents: 'none',
  },
  subTable: {
    position: 'relative',
    zIndex: 1,
    width: 'max-content',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    backgroundColor: 'transparent',
  },
  subHeaderCell: {
    position: 'relative',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('2px', '8px'),
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground1,
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
    height: purchaseOrderSubRowHeight,
    maxHeight: purchaseOrderSubRowHeight,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    boxSizing: 'border-box',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
  subCellContent: {
    display: 'block',
    minWidth: 0,
    maxWidth: '100%',
    height: '100%',
    maxHeight: `calc(${purchaseOrderSubRowHeight} - 4px)`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: `calc(${purchaseOrderSubRowHeight} - 6px)`,
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
  columns,
  onSaveValue,
  onRenameColumn,
  onRemoveColumn,
  onUpdateStatusOptions,
  onCorrect,
  isAdmin,
  onToggleWriteback,
  onReorderColumn,
  columnWidths = {},
  columnTextStyles = {},
  columnFormatRules = {},
  onSaveColumnWidth,
  onSaveColumnTextStyle,
  onSaveColumnFormatRules,
  reorderBusy = false,
  summedLineColumnKeys = [],
  onSetLineColumnTotal,
  onPushLineTotalToHeader,
  onPushLineValuesToHeader,
  headerColumns = [],
  linkedLineTotalByHeaderKey = {},
  linkedLineValueByHeaderKey = {},
}) {
  const styles = useStyles();
  const connectorStyles = useSubitemConnectorStyles();
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
  const groupingColumnKey = '';
  const groupingColor = '';
  const noop = useCallback(() => {}, []);
  const visibleLines = useMemo(() => (Array.isArray(processedLines) ? processedLines : []), [processedLines]);
  const summedColumnsSet = useMemo(
    () => new Set(filterSummableLineColumnKeys(summedLineColumnKeys, lineColumns)),
    [summedLineColumnKeys, lineColumns]
  );
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

  if (!lineColumns.length) return <div className={styles.empty}>No line columns configured.</div>;

  return (
    <div className={styles.subitemsLayout}>
      <div className={styles.subTableCardBackdrop} aria-hidden="true" />
      <table className={styles.subTable}>
      <colgroup>
        <col style={{ width: '22px' }} />
        {lineColumns.map((column) => (
          <col key={`${column.key}-width`} style={{ width: `${effectiveColumnWidths[column.key]}px` }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th className={connectorStyles.connectorHeaderCell} aria-hidden="true" />
          {lineColumns.map((column) => {
            const isSystemColumn = isProductImageColumn(column);
            const hasActiveFilter = isColumnFilterActive(column, filterByColumn[column.key]);
            const hasActiveConditionalFormatting = isColumnFormatRuleSetActive(columnFormatRules[column.key]);
            const connectionTargets = lineColumnConnectionTargets[column.key] || [];
            return (
            <ResizableTableHeaderCell
              key={column.key}
              columnKey={column.key}
              width={effectiveColumnWidths[column.key]}
              minWidth={isSystemColumn ? PRODUCT_IMAGE_MIN_COLUMN_WIDTH : undefined}
              className={[
                styles.subHeaderCell,
                lineColumnDrag.canDrag ? styles.dragDropCell : '',
                lineColumnDrag.draggingKey === column.key ? styles.dragSourceCell : '',
                lineColumnDrag.dropTargetKey === column.key && lineColumnDrag.dropTargetPosition === 'before' ? styles.dropBeforeCell : '',
                lineColumnDrag.dropTargetKey === column.key && lineColumnDrag.dropTargetPosition === 'after' ? styles.dropAfterCell : '',
              ].filter(Boolean).join(' ')}
              onResizeEnd={onSaveColumnWidth}
              {...lineColumnDrag.getCellDragProps(column.key)}
            >
              <div className={styles.headerCellContent}>
                <div className={styles.headerCellLabel}>
                  {isSystemColumn ? (
                    <PurchaseOrderProductImageColumnHeader label={column.label} />
                  ) : (
                    <PurchaseOrderColumnHeader
                      column={column}
                      onRename={onRenameColumn}
                      onRemove={onRemoveColumn}
                      isAdmin={isAdmin}
                      onToggleWriteback={onToggleWriteback}
                      showActionsMenu={false}
                      showFilterIndicator={hasActiveFilter}
                      showConditionalFormattingIndicator={hasActiveConditionalFormatting}
                      showSumIndicator={summedColumnsSet.has(column.key)}
                      showConnectionIndicator={connectionTargets.length > 0}
                    />
                  )}
                </div>
                {!isSystemColumn ? (
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
                  onSetGroupingColumn={noop}
                  onClearGrouping={noop}
                  onSetGroupingColor={noop}
                  onRenameColumn={onRenameColumn}
                  onRemoveColumn={onRemoveColumn}
                  isLineColumnSummed={summedColumnsSet.has(column.key)}
                  onToggleLineColumnSum={onSetLineColumnTotal}
                  onPushLineTotalToHeader={onPushLineTotalToHeader}
                  onPushLineValuesToHeader={onPushLineValuesToHeader}
                  columnTextStyle={columnTextStyles[column.key]}
                  onSetColumnTextStyle={onSaveColumnTextStyle}
                  columnFormatRuleSet={columnFormatRules[column.key]}
                  onSetColumnFormatRules={onSaveColumnFormatRules}
                  referenceColumns={lineColumns}
                  connectionTargets={connectionTargets}
                />
                ) : null}
              </div>
            </ResizableTableHeaderCell>
            );
          })}
        </tr>
      </thead>
      <PurchaseOrdersSubitemsBodyRows
        rowId={rowId}
        order={order}
        lineColumns={lineColumns}
        visibleLines={visibleLines}
        columnWidths={effectiveColumnWidths}
        columnTextStyles={columnTextStyles}
        columnFormatRules={columnFormatRules}
        onSaveValue={onSaveValue}
        onCorrect={onCorrect}
        onUpdateStatusOptions={onUpdateStatusOptions}
        isAdmin={isAdmin}
        subCellClassName={styles.subCell}
        subCellContentClassName={styles.subCellContent}
        noRowsCellClassName={styles.noRowsCell}
        connectorStyles={connectorStyles}
        hasTotalsRow={summedColumnsSet.size > 0}
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
          connectorTotalsCellClassName={connectorStyles.connectorTotalsCell}
        />
      ) : null}
    </table>
    </div>
  );
}
