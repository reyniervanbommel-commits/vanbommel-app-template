import React, { memo, useCallback, useMemo } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import StatusCell from './StatusCell';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import PurchaseOrderProductImageCell from './PurchaseOrderProductImageCell';
import { formatCellValue } from '../../utils/purchaseOrderFormat';
import { calculateLineColumnSum, calculateLineColumnValues } from '../../utils/purchaseOrderTotals';
import { getPurchaseOrderProductImageSummary } from '../../utils/purchaseOrderProductImageSummary';
import { isProductImageColumn } from '../../utils/purchaseOrderProductImageColumn';
import { isStatusColumn } from '../../utils/statusColumnUtils';
import { FORMATTED_CELL_TEXT_COLOR } from './columnTextStyleUtils';

const useStyles = makeStyles({
  removedText: {
    textDecorationLine: 'line-through',
    color: tokens.colorNeutralForeground3,
  },
  formulaError: {
    color: tokens.colorPaletteRedForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  changedCell: {
    backgroundColor: '#fff4ce',
    borderRadius: '4px',
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '24px',
    width: '100%',
    boxSizing: 'border-box',
    paddingLeft: '6px',
    paddingRight: '6px',
  },
});

function PurchaseOrderHeaderCellContent({
  order,
  column,
  onSaveValue,
  onCorrect,
  onUpdateStatusOptions,
  isAdmin = false,
  linkedLineTotalMap,
  linkedLineValueMap,
  cellBackgroundColor = '',
  isConditionalFormat = false,
  productImageLines = order.lines,
}) {
  const styles = useStyles();
  const key = column.key;
  const rawValue = order.values?.[key];
  const formulaExpr = String(column?.formulaExpr || '').trim();
  const isFormulaColumn = Boolean(formulaExpr);
  const formulaError = isFormulaColumn ? String(order?.formulaErrors?.[key] || '') : '';
  const linkedLineTotalColumnKey = linkedLineTotalMap?.[key] || '';
  const linkedLineValueMeta = linkedLineValueMap?.[key] || null;
  const changedFieldKeys = Array.isArray(order?.changedFieldKeys) ? order.changedFieldKeys : [];
  const isChangedCell = !order?.removedInD365 && !order?.isNew && changedFieldKeys.includes(key);
  const productImageSummary = useMemo(
    () => getPurchaseOrderProductImageSummary(productImageLines),
    [productImageLines]
  );

  const handleSave = useCallback((value) => {
    onSaveValue({
      columnId: column.id,
      columnKey: key,
      dataAreaId: order.dataAreaId,
      orderNumber: order.orderNumber,
      lineNumber: null,
      value,
    });
  }, [column.id, key, onSaveValue, order.dataAreaId, order.orderNumber]);

  const handleCorrect = useCallback(({ value, basedOnValue }) => {
    onCorrect({
      columnId: column.id,
      columnKey: key,
      dataAreaId: order.dataAreaId,
      orderNumber: order.orderNumber,
      lineNumber: null,
      value,
      basedOnValue,
    });
  }, [column.id, key, onCorrect, order.dataAreaId, order.orderNumber]);

  const handleUpdateStatusOptions = useCallback((options) => {
    if (typeof onUpdateStatusOptions !== 'function') return Promise.resolve();
    return onUpdateStatusOptions(column.id, options, column.label);
  }, [column.id, column.label, onUpdateStatusOptions]);

  const formattedTextStyle = isConditionalFormat ? { color: FORMATTED_CELL_TEXT_COLOR } : undefined;

  if (isProductImageColumn(column)) {
    if (order.removedInD365 || !productImageSummary.firstItemNumber) return null;
    return (
      <PurchaseOrderProductImageCell
        dataAreaId={order.dataAreaId}
        itemNumber={productImageSummary.firstItemNumber}
        additionalItemCount={productImageSummary.additionalItemCount}
        isConditionalFormat={isConditionalFormat}
      />
    );
  }

  if (column.source === 'custom' && !isFormulaColumn && !linkedLineTotalColumnKey && !linkedLineValueMeta) {
    if (isStatusColumn(column)) {
      return (
        <StatusCell
          value={rawValue}
          options={column.options}
          onSave={handleSave}
          onUpdateOptions={handleUpdateStatusOptions}
          isAdmin={isAdmin}
          ariaLabel={`${column.label} for order ${order.orderNumber}`}
          hasHistory={Boolean(order.historyByColumnId?.[column.id])}
          cellKeys={{
            columnId: column.id,
            dataAreaId: order.dataAreaId,
            orderNumber: order.orderNumber,
            lineNumber: null,
          }}
        />
      );
    }
    return (
      <span className={isChangedCell && !cellBackgroundColor ? styles.changedCell : undefined}>
        <EditableCell
          dataType={column.dataType}
          value={rawValue}
          options={column.options}
          cellBackgroundColor={cellBackgroundColor}
          isConditionalFormat={isConditionalFormat}
          ariaLabel={`${column.label} for order ${order.orderNumber}`}
          hasHistory={Boolean(order.historyByColumnId?.[column.id])}
          cellKeys={{
            columnId: column.id,
            dataAreaId: order.dataAreaId,
            orderNumber: order.orderNumber,
            lineNumber: null,
          }}
          onSave={handleSave}
        />
      </span>
    );
  }

  if (column.source === 'd365' && column.writableToD365 && onCorrect) {
    return (
      <span className={isChangedCell && !cellBackgroundColor ? styles.changedCell : undefined}>
        <PurchaseOrderWriteBackCell
          column={column}
          value={rawValue}
          cellBackgroundColor={cellBackgroundColor}
          isConditionalFormat={isConditionalFormat}
          hasHistory={Boolean(order.historyByColumnId?.[column.id])}
          cellKeys={{
            columnId: column.id,
            dataAreaId: order.dataAreaId,
            orderNumber: order.orderNumber,
            lineNumber: null,
          }}
          onCorrect={handleCorrect}
        />
      </span>
    );
  }

  const display = linkedLineTotalColumnKey
    ? formatCellValue(calculateLineColumnSum(order.lines, linkedLineTotalColumnKey), column.dataType)
    : linkedLineValueMeta
      ? calculateLineColumnValues(order.lines, linkedLineValueMeta.lineColumnKey, linkedLineValueMeta.lineDataType)
      : formatCellValue(rawValue, column.dataType, { columnKey: column.key, columnLabel: column.label });
  const rawDisplayNode = isFormulaColumn
    ? (
      <span className={formulaError ? styles.formulaError : undefined} title={formulaError || undefined}>
        {formulaError ? 'Formula error' : display}
      </span>
    )
    : display;
  const displayNode = isChangedCell && !cellBackgroundColor
    ? <span className={styles.changedCell}>{rawDisplayNode}</span>
    : rawDisplayNode;
  const formattedDisplayNode = isConditionalFormat
    ? <span style={formattedTextStyle}>{displayNode}</span>
    : displayNode;

  return order.removedInD365
    ? <span className={styles.removedText}>{formattedDisplayNode}</span>
    : formattedDisplayNode;
}

export default memo(PurchaseOrderHeaderCellContent);
