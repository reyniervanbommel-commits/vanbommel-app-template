import React, { memo, useCallback } from 'react';
import { Badge, makeStyles, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import { formatCellValue } from '../../utils/purchaseOrderFormat';
import { calculateLineColumnSum, calculateLineColumnValues } from '../../utils/purchaseOrderTotals';

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
    ? <span title={formulaError || undefined}>{formulaError ? '\u00A0' : display}</span>
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
