import { useCallback, useMemo, useRef, useState } from 'react';
import { useRemarksSummary } from './useRemarksSummary';

/**
 * Owns board-level remark summaries and the selected drawer context.
 */
export function usePurchaseOrderRemarksBoard({
  enabled,
  currentUser,
  columns,
  tableKey = 'purchase-orders',
}) {
  const [panelContext, setPanelContext] = useState(null);
  const openerRef = useRef(null);
  const summaryState = useRemarksSummary({ enabled, tableKey });

  const open = useCallback((order, column, target) => {
    if (!order?.dataAreaId || !order?.orderNumber) return;
    openerRef.current = target || null;
    setPanelContext({
      row: {
        partitionKey: order.dataAreaId,
        recordKey: order.orderNumber,
      },
      initialColumn: column || null,
    });
  }, []);

  const close = useCallback(() => setPanelContext(null), []);

  const tableState = useMemo(
    () => ({
      summaryByRow: summaryState.summaryByRow,
      open,
    }),
    [open, summaryState.summaryByRow]
  );

  const panelProps = useMemo(
    () => ({
      open: Boolean(panelContext),
      onClose: close,
      row: panelContext?.row || null,
      currentUser,
      columns,
      initialColumn: panelContext?.initialColumn || null,
      openerRef,
      tableKey,
      summaryState,
    }),
    [close, columns, currentUser, panelContext, summaryState, tableKey]
  );

  return useMemo(
    () => ({ tableState, panelProps }),
    [panelProps, tableState]
  );
}

export default usePurchaseOrderRemarksBoard;
