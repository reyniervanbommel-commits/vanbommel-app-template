import React, { memo, useCallback, useMemo, useState } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import PurchaseOrderImagePreviewDialog from './PurchaseOrderImagePreviewDialog';
import PurchaseOrderProductImageCell from './PurchaseOrderProductImageCell';
import { formatCellValue } from '../../utils/purchaseOrderFormat';
import { calculateLineColumnSum, calculateLineColumnValues } from '../../utils/purchaseOrderTotals';
import { resolveImageUrl } from '../../utils/imageColumnUrl';
import { getPurchaseOrderProductImageSummary } from '../../utils/purchaseOrderProductImageSummary';

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
  productValue: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: '6px',
    minWidth: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    borderRadius: 0,
  },
  imageButton: {
    display: 'block',
    width: 'calc(100% + 20px)',
    height: '18px',
    margin: '-2px -10px',
    overflow: 'hidden',
    border: 'none',
    padding: 0,
    backgroundColor: 'transparent',
    cursor: 'zoom-in',
  },
});

function PurchaseOrderHeaderCellContent({
  order,
  column,
  onSaveValue,
  onCorrect,
  linkedLineTotalMap,
  linkedLineValueMap,
  showProductImagePreview = false,
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
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const productImageSummary = useMemo(
    () => getPurchaseOrderProductImageSummary(productImageLines),
    [productImageLines]
  );
  const productImagePreview = showProductImagePreview && productImageSummary.firstItemNumber ? (
    <PurchaseOrderProductImageCell
      dataAreaId={order.dataAreaId}
      itemNumber={productImageSummary.firstItemNumber}
      additionalItemCount={productImageSummary.additionalItemCount}
    />
  ) : null;
  const wrapWithProductImage = useCallback((content) => (
    productImagePreview ? (
      <span className={styles.productValue}>
        {productImagePreview}
        {content}
      </span>
    ) : content
  ), [productImagePreview, styles.productValue]);

  const handleImageClick = useCallback(() => setImageDialogOpen(true), []);
  const handleImageDialogOpenChange = useCallback((open) => setImageDialogOpen(open), []);
  const handleImageLoadError = useCallback((event) => {
    event.currentTarget.style.display = 'none';
  }, []);

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

  if (column.source === 'custom' && column.dataType === 'image' && !linkedLineTotalColumnKey && !linkedLineValueMeta) {
    const url = resolveImageUrl(column, order.values);
    if (!url) return null;
    return (
      <>
        <button type="button" className={styles.imageButton} onClick={handleImageClick}>
          <img
            key={url}
            className={styles.image}
            src={url}
            alt={`${column.label} voor order ${order.orderNumber}`}
            loading="lazy"
            draggable={false}
            onError={handleImageLoadError}
          />
        </button>
        <PurchaseOrderImagePreviewDialog
          open={imageDialogOpen}
          onOpenChange={handleImageDialogOpenChange}
          imageUrl={url}
          column={column}
          order={order}
        />
      </>
    );
  }

  if (column.source === 'custom' && !isFormulaColumn && !linkedLineTotalColumnKey && !linkedLineValueMeta) {
    return wrapWithProductImage(
      <span className={isChangedCell ? styles.changedCell : undefined}>
        <EditableCell
          dataType={column.dataType}
          value={rawValue}
          options={column.options}
          ariaLabel={`${column.label} voor order ${order.orderNumber}`}
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
    return wrapWithProductImage(
      <span className={isChangedCell ? styles.changedCell : undefined}>
        <PurchaseOrderWriteBackCell
          column={column}
          value={rawValue}
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
        {formulaError ? 'Formulefout' : display}
      </span>
    )
    : display;
  const displayNode = isChangedCell
    ? <span className={styles.changedCell}>{rawDisplayNode}</span>
    : rawDisplayNode;

  const content = order.removedInD365
    ? <span className={styles.removedText}>{displayNode}</span>
    : displayNode;
  return wrapWithProductImage(content);
}

export default memo(PurchaseOrderHeaderCellContent);
