import React, { memo, useCallback, useMemo } from 'react';
import { Badge, makeStyles, shorthands } from '@fluentui/react-components';
import PurchaseOrderLinkedValueCell from './PurchaseOrderLinkedValueCell';
import PurchaseOrderWriteBackCell from './PurchaseOrderWriteBackCell';
import { getLinkedLineValuePreview } from '../../utils/purchaseOrderTotals';

const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: '6px',
    minWidth: 0,
    maxWidth: '100%',
  },
  badge: {
    ...shorthands.flex(0, 0, 'auto'),
  },
});

function resolveRawLineValues(order, headerColumnKey, lineColumnKey) {
  const linked = order?.linkedLineValues?.[headerColumnKey];
  if (Array.isArray(linked)) return linked;
  if (Array.isArray(order?.lines)) {
    return order.lines.map((line) => line?.values?.[lineColumnKey]);
  }
  return null;
}

/**
 * Gepushte header-waarde: read-only rollup of inline write-back naar alle D365-regels van de PO.
 */
function PurchaseOrderLinkedHeaderValue({
  order,
  headerColumnKey,
  meta,
  onCorrectAllLines,
  cellBackgroundColor,
  isConditionalFormat,
  hasHistory,
  cellKeys,
}) {
  const styles = useStyles();
  const rawLineValues = resolveRawLineValues(order, headerColumnKey, meta?.lineColumnKey);
  const preview = useMemo(
    () => getLinkedLineValuePreview(
      rawLineValues,
      meta?.lineDataType,
      { columnKey: meta?.lineColumnKey, columnLabel: meta?.lineColumnLabel },
    ),
    [meta?.lineColumnKey, meta?.lineColumnLabel, meta?.lineDataType, rawLineValues],
  );

  const handleCorrect = useCallback(({ value }) => onCorrectAllLines({
    lineColumnId: meta.lineColumnId,
    lineColumnKey: meta.lineColumnKey,
    headerColumnKey,
    dataAreaId: order.dataAreaId,
    orderNumber: order.orderNumber,
    value,
  }), [headerColumnKey, meta, onCorrectAllLines, order.dataAreaId, order.orderNumber]);

  const readOnly = Boolean(
    order?.removedInD365
    || !meta?.writableToD365
    || !onCorrectAllLines
    || !meta?.lineColumn,
  );

  if (readOnly) {
    return (
      <PurchaseOrderLinkedValueCell
        firstValue={preview.firstValue}
        additionalCount={preview.additionalCount}
        allValuesLabel={preview.allValuesLabel}
        isConditionalFormat={isConditionalFormat}
      />
    );
  }

  const rawValue = Array.isArray(rawLineValues) ? rawLineValues[0] : undefined;
  const columnLabel = meta.lineColumn?.label || meta.lineColumnLabel || headerColumnKey;

  return (
    <span className={styles.root}>
      <PurchaseOrderWriteBackCell
        column={meta.lineColumn}
        value={rawValue}
        onCorrect={handleCorrect}
        cellBackgroundColor={cellBackgroundColor}
        isConditionalFormat={isConditionalFormat}
        hasHistory={hasHistory}
        cellKeys={cellKeys}
        ariaLabel={`${columnLabel} for order ${order.orderNumber} (write back to D365 on all lines)`}
      />
      {preview.additionalCount > 0 ? (
        <Badge
          className={styles.badge}
          appearance="tint"
          color="informative"
          size="small"
          title={preview.allValuesLabel}
          aria-label={`${preview.additionalCount} additional unique values`}
        >
          +{preview.additionalCount}
        </Badge>
      ) : null}
    </span>
  );
}

export default memo(PurchaseOrderLinkedHeaderValue);
