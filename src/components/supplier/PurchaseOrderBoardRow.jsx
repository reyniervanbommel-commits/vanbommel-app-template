import React, { memo, useCallback, useMemo } from 'react';
import { Button, Checkbox } from '@fluentui/react-components';
import PurchaseOrderDataCell from './PurchaseOrderDataCell';
import PurchaseOrderHeaderCellContent from './PurchaseOrderHeaderCellContent';
import PurchaseOrderRowStatusBadge from './PurchaseOrderRowStatusBadge';
import PurchaseOrdersBoardExpandedRow from './PurchaseOrdersBoardExpandedRow';
import { RemarksLatestCell, RowRemarksBadge } from './remarks';
import { rowKey } from './remarks/remarksFormatters';
import { getColumnCellStyle } from './columnTextStyleUtils';
import { evalFormatRules } from './columnFormatRuleUtils';
import { resolveOrderSelectionKey } from '../../hooks/usePurchaseOrderRowSelection';

function getOrderRowClassName(order, styles) {
  if (order.removedInD365) return `${styles.itemRow} ${styles.removedRow}`;
  if (order.isNew) return `${styles.itemRow} ${styles.newRow}`;
  if (order.isChanged) return `${styles.itemRow} ${styles.changedRow}`;
  return styles.itemRow;
}

function resolveRowFormatColor(order, columns, formatRules) {
  if (order?.removedInD365) return '';
  for (const column of columns) {
    const ruleSet = formatRules[column.key];
    if (ruleSet?.target !== 'row') continue;
    const color = evalFormatRules(order?.values?.[column.key], ruleSet, order?.values || {});
    if (color) return color;
  }
  return '';
}

const PurchaseOrderRowControls = memo(function PurchaseOrderRowControls({
  order,
  rowId,
  hasLines,
  isExpanded,
  styles,
  selection,
  onToggleOrder,
  remarks,
}) {
  const selectionKey = resolveOrderSelectionKey(order, rowId);
  const handleSelectionChange = useCallback(() => {
    selection?.toggle?.(selectionKey);
  }, [selection, selectionKey]);
  const handleOpenRemarks = useCallback(
    (target) => remarks?.open?.(order, null, target),
    [order, remarks]
  );

  return (
    <td className={styles.controlCell}>
      <div className={styles.controlCellInner}>
        {selection?.enabled ? (
          <Checkbox
            className={styles.rowCheckbox}
            checked={selection.isSelected(selectionKey)}
            onChange={handleSelectionChange}
            aria-label={`Select order ${order.orderNumber}`}
          />
        ) : null}
        <RowRemarksBadge
          count={remarks?.summary?.count}
          orderNumber={order.orderNumber}
          onOpen={handleOpenRemarks}
        />
        <PurchaseOrderRowStatusBadge order={order} className={styles.rowStatusBadge} />
        {hasLines ? (
          <Button
            size="small"
            appearance="subtle"
            className={styles.compactToggleButton}
            data-rowid={rowId}
            onClick={onToggleOrder}
          >
            {isExpanded ? '-' : '+'}
          </Button>
        ) : null}
      </div>
    </td>
  );
});

const PurchaseOrderBoardCell = memo(function PurchaseOrderBoardCell({
  order,
  column,
  styles,
  formatting,
  actions,
  links,
  contextMenu,
  remarks,
}) {
  const rawValue = order?.values?.[column.key];
  const ruleSet = formatting.headerColumnFormatRules[column.key];
  const cellFormatColor = !order.removedInD365 && ruleSet?.target === 'cell'
    ? evalFormatRules(rawValue, ruleSet, order?.values || {})
    : '';
  const cell = useMemo(() => ({ column, rawValue, order }), [column, order, rawValue]);
  const handleOpenRemarks = useCallback(
    (target) => remarks?.open?.(order, column, target),
    [column, order, remarks]
  );
  const layout = useMemo(() => ({
    className: styles.itemCell,
    style: getColumnCellStyle(
      formatting.headerColumnWidths,
      formatting.headerColumnTextStyles,
      column.key,
      cellFormatColor
    ),
  }), [cellFormatColor, column.key, formatting, styles.itemCell]);

  return (
    <PurchaseOrderDataCell
      cell={cell}
      layout={layout}
      contextMenu={contextMenu}
    >
      {column.dataType === 'remarks' ? (
        <RemarksLatestCell
          summary={remarks?.summary}
          orderNumber={order.orderNumber}
          onOpen={handleOpenRemarks}
        />
      ) : (
        <PurchaseOrderHeaderCellContent
          order={order}
          column={column}
          onSaveValue={actions.onSaveValue}
          onCorrect={actions.onCorrect}
          linkedLineTotalMap={links.linkedLineTotalByHeaderKey}
          linkedLineValueMap={links.linkedLineValueByHeaderKey}
        />
      )}
    </PurchaseOrderDataCell>
  );
});

function PurchaseOrderBoardRow({
  entry,
  layout,
  formatting,
  actions,
  links,
  selection,
  contextMenu,
  remarks,
}) {
  const { order, rowId } = entry;
  const lines = Array.isArray(order.lines) ? order.lines : [];
  const hasLines = lines.length > 0;
  const isExpanded = Boolean(layout.expandedOrders[rowId]);
  const rowFormatColor = resolveRowFormatColor(
    order,
    layout.columns,
    formatting.headerColumnFormatRules
  );
  const rowStyle = useMemo(
    () => (!order.removedInD365 && rowFormatColor
      ? { backgroundColor: rowFormatColor }
      : undefined),
    [order.removedInD365, rowFormatColor]
  );
  const expandedRowData = useMemo(
    () => ({ rowId, order, lines }),
    [lines, order, rowId]
  );
  const remarkSummary = remarks?.summaryByRow?.get(rowKey(order.dataAreaId, order.orderNumber)) || null;
  const rowRemarks = useMemo(
    () => ({ summary: remarkSummary, open: remarks?.open }),
    [remarkSummary, remarks?.open]
  );
  const expandedTableConfig = useMemo(() => ({
    colCount: layout.colCount,
    styles: layout.styles,
    lineColumns: layout.lineColumns,
    lineColumnWidths: formatting.lineColumnWidths,
    lineColumnTextStyles: formatting.lineColumnTextStyles,
    lineColumnFormatRules: formatting.lineColumnFormatRules,
    onSaveLineColumnWidth: actions.onSaveLineColumnWidth,
    lineTotalColumns: links.lineTotalColumns,
    headerColumns: layout.columns,
    ...links,
  }), [actions.onSaveLineColumnWidth, formatting, layout, links]);

  return (
    <React.Fragment>
      <tr className={getOrderRowClassName(order, layout.styles)} style={rowStyle}>
        <PurchaseOrderRowControls
          order={order}
          rowId={rowId}
          hasLines={hasLines}
          isExpanded={isExpanded}
          styles={layout.styles}
          selection={selection}
          onToggleOrder={actions.onToggleOrder}
          remarks={rowRemarks}
        />
        {layout.columns.map((column) => (
          <PurchaseOrderBoardCell
            key={`${rowId}-${column.key}`}
            order={order}
            column={column}
            styles={layout.styles}
            formatting={formatting}
            actions={actions.cellActions}
            links={links}
            contextMenu={contextMenu}
            remarks={rowRemarks}
          />
        ))}
      </tr>
      <PurchaseOrdersBoardExpandedRow
        expanded={hasLines && isExpanded}
        rowData={expandedRowData}
        tableConfig={expandedTableConfig}
        cellActions={actions.cellActions}
      />
    </React.Fragment>
  );
}

export default memo(PurchaseOrderBoardRow);
