import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { rowKey } from './remarksFormatters';
import { useRemarksSummary } from './useRemarksSummary';
import { useRowActivity } from './useRowActivity';
import { useRowRemarks } from './useRowRemarks';

/**
 * Coordinates panel tabs, row-scoped hooks, column filtering and focus restoration.
 */
export function usePurchaseOrderRemarksController({
  open,
  tableKey = 'purchase-orders',
  row,
  initialColumn = null,
  openerRef,
  onClose,
  summaryState = null,
}) {
  const [selectedTab, setSelectedTab] = useState('remarks');
  const [columnId, setColumnId] = useState(initialColumn?.id || '');
  const headingRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const localSummary = useRemarksSummary({ enabled: !summaryState && open, tableKey });
  const summary = summaryState || localSummary;
  const { summaryByRow, updateRow, refresh: refreshSummary } = summary;

  const handleSummaryChange = useCallback(
    (change) => {
      if (!row) return;
      updateRow(row, change);
      if (change.latest === null) refreshSummary();
    },
    [refreshSummary, row, updateRow]
  );

  const remarks = useRowRemarks({
    enabled: open && selectedTab === 'remarks',
    tableKey,
    row,
    onSummaryChange: handleSummaryChange,
  });
  const history = useRowActivity({
    enabled: open && selectedTab === 'history',
    tableKey,
    row,
    kind: 'history',
    columnId: columnId || null,
  });
  const all = useRowActivity({
    enabled: open && selectedTab === 'all',
    tableKey,
    row,
    kind: 'all',
    columnId: columnId || null,
  });

  const onTabSelect = useCallback((_, data) => {
    setSelectedTab(data.value);
  }, []);

  const onColumnChange = useCallback((event) => {
    setColumnId(event.target.value);
  }, []);

  const handleDrawerOpenChange = useCallback(
    (_, data) => {
      if (!data.open) onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = openerRef?.current || document.activeElement;
    setSelectedTab('remarks');
    setColumnId(initialColumn?.id || '');
    const focusFrame = window.requestAnimationFrame(() => headingRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(focusFrame);
      const restoreTarget = openerRef?.current || restoreFocusRef.current;
      window.requestAnimationFrame(() => restoreTarget?.focus?.());
    };
  }, [initialColumn?.id, open, openerRef, row?.partitionKey, row?.recordKey]);

  const selectedSummary = useMemo(
    () => summaryByRow.get(rowKey(row?.partitionKey, row?.recordKey)) || null,
    [row?.partitionKey, row?.recordKey, summaryByRow]
  );

  return useMemo(
    () => ({
      selectedTab,
      columnId,
      onTabSelect,
      onColumnChange,
      handleDrawerOpenChange,
      headingRef,
      remarks,
      history,
      all,
      selectedSummary,
    }),
    [all, columnId, handleDrawerOpenChange, history, onColumnChange, onTabSelect, remarks, selectedSummary, selectedTab]
  );
}

export default usePurchaseOrderRemarksController;
