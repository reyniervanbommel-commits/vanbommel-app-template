import React, { memo, useCallback, useMemo } from 'react';
import { Button, Checkbox } from '@fluentui/react-components';
import PurchaseOrderDataCell from './PurchaseOrderDataCell';
import PurchaseOrderHeaderCellContent from './PurchaseOrderHeaderCellContent';
import PurchaseOrderRowStatusBadge from './PurchaseOrderRowStatusBadge';
import PurchaseOrdersBoardExpandedRow from './PurchaseOrdersBoardExpandedRow';
import { RemarksLatestCell, RowRemarksBadge } from './remarks';
import { rowKey } from './remarks/remarksFormatters';
import { getColumnCellStyle, getFormattedCellContentStyle, getRowFormatControlCellStyle } from './columnTextStyleUtils';
import { evalFormatRules } from './columnFormatRuleUtils';
import { isStatusColumn, resolveStatusCellColor } from '../../utils/statusColumnUtils';
import { resolveOrderSelectionKey } from '../../hooks/usePurchaseOrderRowSelection';
import { orderLocateKeyFromOrder, ROW_LOCATE_HIGHLIGHT_COLOR } from '../../utils/purchaseOrderRowLocate';
import {
  getProductImageCellStyle,
  isProductImageColumn,
  PRODUCT_IMAGE_SUB_CELL_HEIGHT,
} from '../../utils/purchaseOrderProductImageColumn';
import { PURCHASE_ORDER_BOARD_ROW_HEIGHT_PX } from './purchaseOrderBoardLayout';
import PurchaseOrderCollapsedColumnCell from './PurchaseOrderCollapsedColumnCell';
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

function resolveOrderCellBackground({ order, column, ruleSet, rowFormatColor }) {
  const statusOptions = isStatusColumn(column) ? column.options : null;
  const cellFormatColor = (!order.removedInD365 && ruleSet?.target === 'cell')
    ? evalFormatRules(order?.values?.[column.key], ruleSet, order?.values || {}, statusOptions)
    : '';
  if (cellFormatColor) {
    return { backgroundColor: cellFormatColor, isConditionalFormat: true };
  }
  if (!order.removedInD365 && rowFormatColor) {
    return { backgroundColor: rowFormatColor, isConditionalFormat: true };
  }
  if (isStatusColumn(column)) {
    return {
      backgroundColor: resolveStatusCellColor(order?.values?.[column.key], column.options),
      isConditionalFormat: false,
    };
  }
  return { backgroundColor: '', isConditionalFormat: false };
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
  rowFormatColor = '',
  isLocated = false,
}) {
  const selectionKey = resolveOrderSelectionKey(order, rowId);
  const controlCellStyle = useMemo(
    () => (isLocated
      ? { backgroundColor: ROW_LOCATE_HIGHLIGHT_COLOR, zIndex: 5 }
      : getRowFormatControlCellStyle(rowFormatColor)),
    [isLocated, rowFormatColor]
  );
  const hasRowFormatColor = Boolean(controlCellStyle);
  const handleSelectionChange = useCallback(() => {
    selection?.toggle?.(selectionKey);
  }, [selection, selectionKey]);
  const handleOpenRemarks = useCallback(
    (target) => remarks?.open?.(order, null, target),
    [order, remarks]
  );

  const controlCellClassName = isLocated
    ? `${styles.controlCell} ${styles.locateHighlightControlCell}`
    : styles.controlCell;

  return (
    <td className={controlCellClassName} style={controlCellStyle}>
      <div className={styles.controlCellInner}>
        <div className={styles.rowControlsCluster}>
          {selection?.enabled ? (
            <Checkbox
              className={styles.rowCheckbox}
              checked={selection.isSelected(selectionKey)}
              onChange={handleSelectionChange}
              aria-label={`Select order ${order.orderNumber}`}
            />
          ) : null}
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
          <RowRemarksBadge
            count={remarks?.summary?.count}
            orderNumber={order.orderNumber}
            onOpen={handleOpenRemarks}
            onFormattedBackground={hasRowFormatColor}
          />
        </div>
        <PurchaseOrderRowStatusBadge order={order} className={styles.rowStatusBadge} />
      </div>
    </td>
  );
});

// Custom memo-vergelijking: een cel hangt alleen af van de opmaak van ZIJN eigen kolom. Bij een
// text-style/format/breedte-wijziging aan één kolom krijgt het hele 'formatting'-object een nieuwe
// referentie; door hier alleen de per-kolom slices te vergelijken slaan cellen van niet-gewijzigde
// kolommen hun re-render over (BL-006). Alle overige props worden strikt (Object.is) vergeleken —
// wijkt er iets af, dan hertekenen we (veilig). Vereist referentie-stabiele slices (zie
// normalizeColumnTextStyleMap previous-param + effectiveHeaderTextStylesRef).
function areBoardCellPropsEqual(prev, next) {
  if (prev.column !== next.column) return false;
  const key = next.column?.key;
  const pf = prev.formatting;
  const nf = next.formatting;
  if (pf !== nf) {
    if (pf?.headerColumnWidths?.[key] !== nf?.headerColumnWidths?.[key]) return false;
    if (pf?.headerColumnTextStyles?.[key] !== nf?.headerColumnTextStyles?.[key]) return false;
    if (pf?.headerColumnFormatRules?.[key] !== nf?.headerColumnFormatRules?.[key]) return false;
  }
  return prev.order === next.order
    && prev.styles === next.styles
    && prev.actions === next.actions
    && prev.links === next.links
    && prev.contextMenu === next.contextMenu
    && prev.remarks === next.remarks
    && prev.rowFormatColor === next.rowFormatColor
    && prev.isLocated === next.isLocated
    && prev.isCollapsed === next.isCollapsed;
}

const PurchaseOrderBoardCell = memo(function PurchaseOrderBoardCell({
  order,
  column,
  styles,
  formatting,
  actions,
  links,
  contextMenu,
  remarks,
  rowFormatColor,
  isLocated = false,
  isCollapsed = false,
}) {
  if (isCollapsed) {
    return (
      <PurchaseOrderCollapsedColumnCell
        columnKey={column.key}
      />
    );
  }
  const rawValue = order?.values?.[column.key];
  const ruleSet = formatting.headerColumnFormatRules[column.key];
  const { backgroundColor: cellBackgroundColor, isConditionalFormat } = resolveOrderCellBackground({
    order,
    column,
    ruleSet,
    rowFormatColor,
  });
  const cell = useMemo(() => ({ column, rawValue, order }), [column, order, rawValue]);
  const isImageColumn = isProductImageColumn(column);
  const isStatus = isStatusColumn(column);
  const handleOpenRemarks = useCallback(
    (target) => remarks?.open?.(order, column, target),
    [column, order, remarks]
  );
  const layout = useMemo(() => {
    const highlightBackground = isLocated ? ROW_LOCATE_HIGHLIGHT_COLOR : cellBackgroundColor;
    const useFormattedText = isLocated ? false : isConditionalFormat;
    const baseStyle = getColumnCellStyle(
      formatting.headerColumnWidths,
      formatting.headerColumnTextStyles,
      column.key,
      highlightBackground,
      { useFormattedTextColor: useFormattedText }
    );
    return {
      className: styles.itemCell,
      contentClassName: isImageColumn ? undefined : styles.itemCellContent,
      contentStyle: getFormattedCellContentStyle(useFormattedText),
      style: isImageColumn
        ? getProductImageCellStyle(baseStyle, PURCHASE_ORDER_BOARD_ROW_HEIGHT_PX)
        : {
          ...baseStyle,
          ...(isStatus ? { padding: 0 } : {}),
        },
      isLocated,
    };
  }, [cellBackgroundColor, column.key, formatting, isConditionalFormat, isImageColumn, isLocated, isStatus, styles.itemCell, styles.itemCellContent]);

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
          onFormattedBackground={isConditionalFormat}
        />
      ) : (
        <PurchaseOrderHeaderCellContent
          order={order}
          column={column}
          onSaveValue={actions.onSaveValue}
          onCorrect={actions.onCorrect}
          onUpdateStatusOptions={actions.onUpdateStatusOptions}
          isAdmin={actions.isAdmin}
          cellBackgroundColor={cellBackgroundColor}
          isConditionalFormat={isConditionalFormat}
          linkedLineTotalMap={links.linkedLineTotalByHeaderKey}
          linkedLineValueMap={links.linkedLineValueByHeaderKey}
          productImageSummary={order.productImageSummary}
          showHistoryIndicators={actions.showHistoryIndicators}
          datePeriodDisplayModes={actions.datePeriodDisplayModes}
        />
      )}
    </PurchaseOrderDataCell>
  );
}, areBoardCellPropsEqual);

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
}) {
  const { order, rowId } = entry;
  // lineCount komt uit de server-rollup; de regels zelf worden pas bij het openklappen geladen.
  const hasLines = (Number(order.lineCount) || 0) > 0;
  // Doorloopt alle kolommen × format-regels; per rij memoïseren scheelt dat werk bij elke
  // hertekening die niets met opmaak te maken heeft (expand, selectie, remark-badge).
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
  // Alleen afhankelijk van de lijn-specifieke slices. Een header-only opmaakwijziging geeft
  // 'formatting'/'layout' een nieuwe referentie, maar mag de open subtabellen niet hertekenen.
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
            rowFormatColor={rowFormatColor}
            isLocated={isLocated}
            isCollapsed={isColumnCollapsed(column.key, layout.collapsedHeaderColumnKeys)}
          />
        ))}
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
