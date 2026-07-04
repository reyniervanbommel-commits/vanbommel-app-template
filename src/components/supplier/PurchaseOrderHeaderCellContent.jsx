import React, { memo, useCallback } from 'react';
import { Badge, makeStyles, tokens } from '@fluentui/react-components';
import EditableCell from './EditableCell';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
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
  image: {
    height: '30px',
    maxWidth: '100%',
    objectFit: 'contain',
    display: 'block',
    borderRadius: tokens.borderRadiusSmall,
  },
});

function PurchaseOrderHeaderCellContent({ order, column, isFirst, onSaveValue, onCorrect, linkedLineTotalMap, linkedLineValueMap }) {
  const styles = useStyles();
  const key = column.key;
  const rawValue = order.values?.[key];
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

  // Image-kolommen zijn read-only en afgeleid: de URL wordt uit een andere kolom
  // opgebouwd (resolveImageUrl). Geen EditableCell, geen opgeslagen waarde.
  if (column.source === 'custom' && column.dataType === 'image' && !linkedLineTotalColumnKey && !linkedLineValueMeta) {
    const url = resolveImageUrl(column, order.values);
    if (!url) {
      // Geen bronwaarde of onvolledige/onveilige config: niets renderen.
      return null;
    }
    return (
      <img
        // key op de URL: bij een nieuwe bronwaarde/URL mount React een vers <img> zodat een
        // eerdere onError-verberging (display:none) niet blijft plakken op een geldige nieuwe src.
        key={url}
        className={styles.image}
        src={url}
        alt={`${column.label} voor order ${order.orderNumber}`}
        loading="lazy"
        draggable={false}
        // Verberg de img bij een kapotte URL zodat er geen gebroken-afbeelding-icoon verschijnt.
        onError={(event) => { event.currentTarget.style.display = 'none'; }}
      />
    );
  }

  if (column.source === 'custom' && !linkedLineTotalColumnKey && !linkedLineValueMeta) {
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
      : formatCellValue(rawValue, column.dataType);

  if (isFirst && order.removedInD365) {
    return (
      <span>
        <span className={styles.removedText}>{display}</span>
        <Badge className={styles.removedBadge} color="danger" appearance="tint" size="small">
          verwijderd in D365
        </Badge>
      </span>
    );
  }

  if (isFirst && (order.isNew || order.isChanged)) {
    return (
      <span>
        {display}
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

  return order.removedInD365 ? <span className={styles.removedText}>{display}</span> : display;
}

export default memo(PurchaseOrderHeaderCellContent);
