import React, { memo, useCallback } from 'react';
import { Button, Checkbox } from '@fluentui/react-components';
import PurchaseOrderRowStatusBadge from './PurchaseOrderRowStatusBadge';

function PurchaseOrdersBoardRowControls({
  order,
  rowId,
  hasLines,
  isExpanded,
  selection,
  selectionKey,
  onToggleOrder,
  styles,
}) {
  const selectionEnabled = Boolean(selection?.enabled);
  const handleSelectionChange = useCallback(() => {
    selection?.toggle?.(selectionKey);
  }, [selection, selectionKey]);

  return (
    <td className={styles.controlCell}>
      <div className={styles.controlCellInner}>
        {selectionEnabled ? (
          <Checkbox
            className={styles.rowCheckbox}
            checked={selection.isSelected(selectionKey)}
            onChange={handleSelectionChange}
            aria-label={`Selecteer order ${order.orderNumber}`}
          />
        ) : null}
        <PurchaseOrderRowStatusBadge order={order} className={styles.rowStatusBadge} />
        {hasLines ? (
          <Button
            size="small"
            appearance="subtle"
            className={styles.compactToggleButton}
            data-rowid={rowId}
            onClick={onToggleOrder}
            aria-label={isExpanded ? `Sluit regels van order ${order.orderNumber}` : `Open regels van order ${order.orderNumber}`}
          >
            {isExpanded ? '-' : '+'}
          </Button>
        ) : null}
      </div>
    </td>
  );
}

export default memo(PurchaseOrdersBoardRowControls);
