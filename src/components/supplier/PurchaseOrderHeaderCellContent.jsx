import React, { memo, useCallback, useState } from 'react';
import { Badge, makeStyles, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import PurchaseOrderImagePreviewDialog from './PurchaseOrderImagePreviewDialog';
import { formatCellValue } from '../../utils/purchaseOrderFormat';
import { calculateLineColumnSum, calculateLineColumnValues } from '../../utils/purchaseOrderTotals';
import { resolveImageUrl } from '../../utils/imageColumnUrl';

const useStyles = makeStyles({
  removedText: {
    textDecorationLine: 'line-through',
    color: tokens.colorNeutralForeground3,
  },
  removedBadge: {
    marginLeft: '6px',
  },
  rowBadge: {
    marginLeft: '6px',
  },
  formulaError: {
    color: tokens.colorPaletteRedForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  image: {
    width: 'calc(100% + 20px)',
    height: 'calc(100% + 4px)',
    margin: '-2px -10px',
    objectFit: 'cover',
    display: 'block',
    borderRadius: 0,
  },
  imageButton: {
    display: 'block',
    width: '100%',
    height: '100%',
    border: 'none',
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    cursor: 'zoom-in',
  },
});

function PurchaseOrderHeaderCellContent({ order, column, isFirst, onSaveValue, onCorrect, linkedLineTotalMap, linkedLineValueMap }) {
  const styles = useStyles();
  const key = column.key;
  const rawValue = order.values?.[key];
  const formulaExpr = String(column?.formulaExpr || '').trim();
  const isFormulaColumn = Boolean(formulaExpr);
  const formulaError = isFormulaColumn ? String(order?.formulaErrors?.[key] || '') : '';
  const linkedLineTotalColumnKey = linkedLineTotalMap?.[key] || '';
  const linkedLineValueMeta = linkedLineValueMap?.[key] || null;
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  if (column.source === 'custom' && column.dataType === 'image' && !linkedLineTotalColumnKey && !linkedLineValueMeta) {
    const url = resolveImageUrl(column, order.values);
    if (!url) return null;
    const handleImageClick = () => setImageDialogOpen(true);
    const handleImageDialogOpenChange = (open) => setImageDialogOpen(open);
    const handleImageLoadError = (event) => { event.currentTarget.style.display = 'none'; };
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

  if (column.source === 'custom' && !isFormulaColumn && !linkedLineTotalColumnKey && !linkedLineValueMeta) {
    return (
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
    );
  }

  if (column.source === 'd365' && column.writableToD365 && onCorrect) {
    return (
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
    );
  }

  const display = linkedLineTotalColumnKey
    ? formatCellValue(calculateLineColumnSum(order.lines, linkedLineTotalColumnKey), column.dataType)
    : linkedLineValueMeta
      ? calculateLineColumnValues(order.lines, linkedLineValueMeta.lineColumnKey, linkedLineValueMeta.lineDataType)
      : formatCellValue(rawValue, column.dataType, { columnKey: column.key, columnLabel: column.label });
  const displayNode = isFormulaColumn
    ? (
      <span className={formulaError ? styles.formulaError : undefined} title={formulaError || undefined}>
        {formulaError ? 'Formulefout' : display}
      </span>
    )
    : display;

  if (isFirst && order.removedInD365) {
    return (
      <span>
        <span className={styles.removedText}>{displayNode}</span>
        <Badge className={styles.removedBadge} color="danger" appearance="tint" size="small">
          verwijderd in D365
        </Badge>
      </span>
    );
  }

  if (isFirst && (order.isNew || order.isChanged)) {
    return (
      <span>
        {displayNode}
        <Badge
          className={styles.rowBadge}
          color={order.isNew ? 'success' : 'warning'}
          appearance="tint"
          size="small"
        >
          {order.isNew ? 'nieuw' : 'gewijzigd'}
        </Badge>
      </span>
    );
  }

  return order.removedInD365 ? <span className={styles.removedText}>{displayNode}</span> : displayNode;
}

export default memo(PurchaseOrderHeaderCellContent);
