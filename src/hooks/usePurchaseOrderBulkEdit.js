import { useCallback, useMemo, useRef, useState } from 'react';
import { rowSelectionKey } from './usePurchaseOrderRowSelection';

const EMPTY_DIALOG_STATE = {
  open: false,
  mode: 'confirm',
  columnLabel: '',
  selectedCount: 0,
  processedCount: 0,
  busy: false,
  summaryMessage: '',
};

function isHeaderCellUpdate(payload) {
  return payload?.lineNumber === null || payload?.lineNumber === undefined;
}

function valuesEqual(left, right) {
  if (Object.is(left, right)) return true;
  const normalizedLeft = left === undefined ? null : left;
  const normalizedRight = right === undefined ? null : right;
  if (Object.is(normalizedLeft, normalizedRight)) return true;
  return String(normalizedLeft ?? '') === String(normalizedRight ?? '');
}

function createBulkErrorMessage({ updated, skipped, notTried }) {
  return `Bulkbewerking gestopt door een fout. Bijgewerkt: ${updated}. Overgeslagen (al gelijk): ${skipped}. Niet geprobeerd (na fout): ${notTried}.`;
}

/**
 * Regelt bulk-bewerken van header-cellen voor zichtbare geselecteerde orderrijen.
 * Input: selectie + zichtbare orders + save/correct handlers. Output: wrapped handlers en dialoog-state/acties.
 */
export function usePurchaseOrderBulkEdit({
  visibleHeaderColumns = [],
  visibleOrders = [],
  selection,
  saveValue,
  correctField,
}) {
  const decisionResolverRef = useRef(null);
  const [dialogState, setDialogState] = useState(EMPTY_DIALOG_STATE);

  const columnLabelByKey = useMemo(
    () => new Map((Array.isArray(visibleHeaderColumns) ? visibleHeaderColumns : []).map((column) => [column.key, column.label || column.key])),
    [visibleHeaderColumns]
  );

  const selectedVisibleOrders = useMemo(
    () => (Array.isArray(visibleOrders) ? visibleOrders : []).filter(
      (order) => selection?.isSelected?.(rowSelectionKey(order?.dataAreaId, order?.orderNumber))
    ),
    [visibleOrders, selection]
  );

  const selectedVisibleKeys = useMemo(
    () => new Set(selectedVisibleOrders.map((order) => rowSelectionKey(order.dataAreaId, order.orderNumber))),
    [selectedVisibleOrders]
  );

  const runSingleUpdate = useCallback(async (mode, payload) => {
    if (mode === 'correct') {
      await correctField(payload);
      return;
    }
    await saveValue(payload);
  }, [correctField, saveValue]);

  const showDecisionDialog = useCallback(({ columnLabel, selectedCount }) => (
    new Promise((resolve) => {
      decisionResolverRef.current = resolve;
      setDialogState({
        open: true,
        mode: 'confirm',
        columnLabel,
        selectedCount,
        processedCount: 0,
        busy: false,
        summaryMessage: '',
      });
    })
  ), []);

  const closeDialog = useCallback(() => {
    decisionResolverRef.current = null;
    setDialogState(EMPTY_DIALOG_STATE);
  }, []);

  const resolveDialogDecision = useCallback((decision) => {
    const resolver = decisionResolverRef.current;
    if (!resolver) return;
    decisionResolverRef.current = null;
    if (decision === 'bulk') {
      setDialogState((previous) => ({
        ...previous,
        busy: true,
      }));
    } else {
      setDialogState(EMPTY_DIALOG_STATE);
    }
    resolver(decision);
  }, []);

  const openSummaryDialog = useCallback((summaryMessage) => {
    setDialogState((previous) => ({
      ...previous,
      open: true,
      mode: 'summary',
      busy: false,
      summaryMessage,
    }));
  }, []);

  const runBulkUpdate = useCallback(async ({ mode, payload, rows }) => {
    let updated = 0;
    let skipped = 0;
    const total = rows.length;
    for (let index = 0; index < total; index += 1) {
      const row = rows[index];
      const currentValue = row?.values?.[payload.columnKey];
      if (valuesEqual(currentValue, payload.value)) {
        skipped += 1;
        setDialogState((previous) => ({ ...previous, processedCount: index + 1 }));
        continue;
      }
      const rowPayload = {
        ...payload,
        dataAreaId: row.dataAreaId,
        orderNumber: row.orderNumber,
        lineNumber: null,
      };
      if (mode === 'correct') {
        rowPayload.basedOnValue = currentValue;
      }
      try {
        await runSingleUpdate(mode, rowPayload);
        updated += 1;
        setDialogState((previous) => ({ ...previous, processedCount: index + 1 }));
      } catch (err) {
        const notTried = Math.max(0, total - (updated + skipped + 1));
        const summaryMessage = createBulkErrorMessage({ updated, skipped, notTried });
        openSummaryDialog(summaryMessage);
        throw new Error(summaryMessage);
      }
    }
    closeDialog();
  }, [closeDialog, openSummaryDialog, runSingleUpdate]);

  const executeWithBulkOption = useCallback(async (mode, payload) => {
    if (!isHeaderCellUpdate(payload)) {
      await runSingleUpdate(mode, payload);
      return;
    }
    const activeOrderKey = rowSelectionKey(payload.dataAreaId, payload.orderNumber);
    const visibleSelectionCount = selectedVisibleOrders.length;
    if (visibleSelectionCount <= 1 || !selectedVisibleKeys.has(activeOrderKey)) {
      await runSingleUpdate(mode, payload);
      return;
    }

    const columnLabel = columnLabelByKey.get(payload.columnKey) || payload.columnKey || 'deze kolom';
    const decision = await showDecisionDialog({ columnLabel, selectedCount: visibleSelectionCount });
    if (decision !== 'bulk') {
      await runSingleUpdate(mode, payload);
      return;
    }
    await runBulkUpdate({ mode, payload, rows: selectedVisibleOrders });
  }, [
    columnLabelByKey,
    runBulkUpdate,
    runSingleUpdate,
    selectedVisibleKeys,
    selectedVisibleOrders,
    showDecisionDialog,
  ]);

  const handleSaveValue = useCallback(
    async (payload) => executeWithBulkOption('save', payload),
    [executeWithBulkOption]
  );
  const handleCorrectField = useCallback(
    async (payload) => executeWithBulkOption('correct', payload),
    [executeWithBulkOption]
  );
  const handleDialogOpenChange = useCallback((open) => {
    if (open) return;
    if (dialogState.mode === 'confirm') {
      resolveDialogDecision('single');
      return;
    }
    closeDialog();
  }, [closeDialog, dialogState.mode, resolveDialogDecision]);

  return useMemo(() => ({
    handleSaveValue,
    handleCorrectField,
    dialogState,
    dialogActions: {
      onOpenChange: handleDialogOpenChange,
      onChooseSingleCell: () => resolveDialogDecision('single'),
      onChooseBulk: () => resolveDialogDecision('bulk'),
      onCloseSummary: closeDialog,
    },
  }), [
    closeDialog,
    dialogState,
    handleCorrectField,
    handleDialogOpenChange,
    handleSaveValue,
    resolveDialogDecision,
  ]);
}
