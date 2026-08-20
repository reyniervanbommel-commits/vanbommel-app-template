import React, { memo, useMemo } from 'react';
import { PurchaseOrderBoardCell } from './PurchaseOrderBoardCell';
import { PurchaseOrderRowControls } from './PurchaseOrderRowControls';
import PurchaseOrdersBoardExpandedRow from './PurchaseOrdersBoardExpandedRow';
import { rowKey } from './remarks/remarksFormatters';
import { evalFormatRules } from './columnFormatRuleUtils';
import { isStatusColumn } from '../../utils/statusColumnUtils';
import { orderLocateKeyFromOrder, ROW_LOCATE_HIGHLIGHT_COLOR } from '../../utils/purchaseOrderRowLocate';
import { isColumnCollapsed } from '../../utils/collapsedColumnUtils';

function getOrderRowClassName(order, styles) {
  const classes = [];
  if (order.removedInD365) classes.push(styles.itemRow, styles.removedRow);
  else if (order.isNew) classes.push(styles.itemRow, styles.newRow);
  else if (order.isChanged) classes.push(styles.itemRow, styles.changedRow);
  else classes.push(styles.itemRow);
  return classes.join(' ');
}

function resolveRowFormatColor(order, columns, formatRules) {
  if (order?.removedInD365) return '';
  for (const column of columns) {
    const ruleSet = formatRules[column.key];
    if (ruleSet?.target !== 'row') continue;
    const statusOptions = isStatusColumn(column) ? column.options : null;
    const color = evalFormatRules(order?.values?.[column.key], ruleSet, order?.values || {}, statusOptions);
    if (color) return color;
  }
  return '';
}

function PurchaseOrderBoardRow({
  entry,
  layout,
  isExpanded = false,
  isLocated = false,
  formatting,
  actions,
  links,
  selection,
  contextMenu,
  remarks,
  onMeasureExpanded,
  colWindow = null,
}) {
  const { order, rowId } = entry;
  const hasLines = (Number(order.lineCount) || 0) > 0;
  const rowFormatColor = useMemo(
    () => resolveRowFormatColor(order, layout.columns, formatting.headerColumnFormatRules),
    [formatting.headerColumnFormatRules, layout.columns, order]
  );
  const locateKey = orderLocateKeyFromOrder(order);
  const rowStyle = useMemo(
    () => {
      if (isLocated) return { backgroundColor: ROW_LOCATE_HIGHLIGHT_COLOR };
      if (!order.removedInD365 && rowFormatColor) return { backgroundColor: rowFormatColor };
      return undefined;
    },
    [isLocated, order.removedInD365, rowFormatColor]
  );
  const expandedRowData = useMemo(
    () => ({ rowId, order, lines: order.lines }),
    [order, rowId]
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
    collapsedLineColumnKeys: layout.collapsedLineColumnKeys,
    onToggleLineColumnCollapsed: actions.onToggleLineColumnCollapsed,
    ...links,
  }), [
    layout.colCount,
    layout.styles,
    layout.lineColumns,
    layout.columns,
    layout.collapsedLineColumnKeys,
    formatting.lineColumnWidths,
    formatting.lineColumnTextStyles,
    formatting.lineColumnFormatRules,
    actions.onSaveLineColumnWidth,
    actions.onToggleLineColumnCollapsed,
    links,
  ]);

  return (
    <React.Fragment>
      <tr
        className={getOrderRowClassName(order, layout.styles)}
        style={rowStyle}
        data-locate-key={locateKey}
      >
        <PurchaseOrderRowControls
          order={order}
          rowId={rowId}
          hasLines={hasLines}
          isExpanded={isExpanded}
          styles={layout.styles}
          selection={selection}
          onToggleOrder={actions.onToggleOrder}
          remarks={rowRemarks}
          rowFormatColor={rowFormatColor}
          isLocated={isLocated}
        />
        {/* B1: colSpan-spacer voor niet-gerenderde kolommen links */}
        {colWindow?.leftSpanCount > 0 ? (
          <td colSpan={colWindow.leftSpanCount} style={{ padding: 0, border: 0 }} />
        ) : null}
        {(colWindow
          ? layout.columns.slice(colWindow.colStart, colWindow.colEnd)
          : layout.columns
        ).map((column) => (
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
            rowFormatColor={rowFormatColor}
            isLocated={isLocated}
            isCollapsed={isColumnCollapsed(column.key, layout.collapsedHeaderColumnKeys)}
          />
        ))}
        {/* B1: colSpan-spacer voor niet-gerenderde kolommen rechts */}
        {colWindow?.rightSpanCount > 0 ? (
          <td colSpan={colWindow.rightSpanCount} style={{ padding: 0, border: 0 }} />
        ) : null}
      </tr>
      <PurchaseOrdersBoardExpandedRow
        expanded={hasLines && isExpanded}
        rowData={expandedRowData}
        tableConfig={expandedTableConfig}
        cellActions={actions.cellActions}
        onMeasureExpanded={onMeasureExpanded}
      />
    </React.Fragment>
  );
}

export default memo(PurchaseOrderBoardRow);
