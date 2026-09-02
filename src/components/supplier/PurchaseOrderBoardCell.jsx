import { memo, useCallback, useMemo } from 'react';
import PurchaseOrderDataCell from './PurchaseOrderDataCell';
import PurchaseOrderHeaderCellContent from './PurchaseOrderHeaderCellContent';
import { RemarksLatestCell } from './remarks';
import { getColumnCellStyle, getFormattedCellContentStyle } from './columnTextStyleUtils';
import { evalFormatRules } from './columnFormatRuleUtils';
import { isStatusColumn, resolveStatusCellColor } from '../../utils/statusColumnUtils';
import { ROW_LOCATE_HIGHLIGHT_COLOR } from '../../utils/purchaseOrderRowLocate';
import {
  getProductImageCellStyle,
  isProductImageColumn,
} from '../../utils/purchaseOrderProductImageColumn';
import { PURCHASE_ORDER_BOARD_ROW_HEIGHT_PX } from './purchaseOrderBoardLayout';
import PurchaseOrderCollapsedColumnCell from './PurchaseOrderCollapsedColumnCell';

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

// Custom memo-vergelijking: een cel hangt alleen af van de opmaak van ZIJN eigen kolom. Bij een
// text-style/format/breedte-wijziging aan één kolom krijgt het hele 'formatting'-object een nieuwe
// referentie; door hier alleen de per-kolom slices te vergelijken slaan cellen van niet-gewijzigde
// kolommen hun re-render over (BL-006). Alle overige props worden strikt (Object.is) vergeleken —
// wijkt er iets af, dan hertekenen we (veilig). Vereist referentie-stabiele slices (zie
// normalizeColumnTextStyleMap previous-param + effectiveHeaderTextStylesRef).
export function areBoardCellPropsEqual(prev, next) {
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

export const PurchaseOrderBoardCell = memo(function PurchaseOrderBoardCell({
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
      contentClassName: (isImageColumn || isStatus) ? undefined : styles.itemCellContent,
      contentStyle: isStatus
        ? { height: '100%', minHeight: 0, overflow: 'visible' }
        : getFormattedCellContentStyle(useFormattedText),
      style: isImageColumn
        ? getProductImageCellStyle(baseStyle, PURCHASE_ORDER_BOARD_ROW_HEIGHT_PX)
        : {
          ...baseStyle,
          ...(isStatus ? {
            padding: 0,
            '--po-cell-padding-y': '0px',
            '--po-cell-padding-x': '0px',
          } : {}),
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
          actions={actions}
          cellBackgroundColor={cellBackgroundColor}
          isConditionalFormat={isConditionalFormat}
          linkedLineTotalMap={links.linkedLineTotalByHeaderKey}
          linkedLineValueMap={links.linkedLineValueByHeaderKey}
          productImageSummary={order.productImageSummary}
          datePeriodDisplayModes={actions.datePeriodDisplayModes}
        />
      )}
    </PurchaseOrderDataCell>
  );
}, areBoardCellPropsEqual);
