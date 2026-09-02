import { useCallback, useMemo, useRef, useState } from 'react';
import { resolveOrderSelectionKey, rowSelectionKey } from './usePurchaseOrderRowSelection';
import { valuesEqual, runCorrectRows } from './purchaseOrderBulkEditRun';
import { usePurchaseOrderBulkEditRetry } from './usePurchaseOrderBulkEditRetry';

const EMPTY_DIALOG_STATE = {
  open: false,
  mode: 'confirm',
  columnLabel: '',
  selectedCount: 0,
  processedCount: 0,
  busy: false,
  summaryMessage: '',
  failedRows: [],
  updated: 0,
  skipped: 0,
};

function isHeaderCellUpdate(payload) {
  return payload?.lineNumber === null || payload?.lineNumber === undefined;
}

function createBulkErrorMessage({ updated, skipped, notTried }) {
  return `Bulk edit stopped due to an error. Updated: ${updated}. Skipped (already equal): ${skipped}. Not attempted (after error): ${notTried}.`;
}

function buildCorrectSummaryMessage({ updated, skipped, failedCount }) {
  return `Bulk edit finished. Updated: ${updated}. Skipped: ${skipped}. Failed: ${failedCount}.`;
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
      (order) => selection?.isSelected?.(resolveOrderSelectionKey(order))
    ),
    [visibleOrders, selection]
  );

  const selectedVisibleKeys = useMemo(
    () => new Set(selectedVisibleOrders.map((order) => resolveOrderSelectionKey(order))),
    [selectedVisibleOrders]
  );

  const runSingleUpdate = useCallback(async (mode, payload) => {
    if (mode === 'correct') {
      await correctField(payload);
      return;
    }
    await saveValue(payload);
  }, [correctField, saveValue]);

  const handleFailedRowsChange = useCallback((updateFailedRows) => setDialogState((prev) => {
    const failedRows = updateFailedRows(prev.failedRows || []);
    return {
      ...prev,
      failedRows,
      summaryMessage: buildCorrectSummaryMessage({
        updated: prev.updated,
        skipped: prev.skipped,
        failedCount: failedRows.length,
      }),
    };
  }), []);

  const retry = usePurchaseOrderBulkEditRetry({
    failedRows: dialogState.failedRows,
    onFailedRowsChange: handleFailedRowsChange,
    runSingleUpdate,
  });

  const showDecisionDialog = useCallback(({ columnLabel, selectedCount }) => (
    new Promise((resolve) => {
      decisionResolverRef.current = resolve;
      setDialogState({
        ...EMPTY_DIALOG_STATE,
        open: true,
        mode: 'confirm',
        columnLabel,
        selectedCount,
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

  const runBulkUpdateCorrect = useCallback(async (payload, rows, activeOrderKey) => {
    const candidates = rows.map((row) => ({
      dataAreaId: row.dataAreaId,
      orderNumber: row.orderNumber,
      currentValue: row?.values?.[payload.columnKey],
    }));
    let processed = 0;
    const { updated, skipped, failedRows } = await runCorrectRows({
      candidates,
      payload,
      runSingleUpdate,
      onSettled: () => {
        processed += 1;
        setDialogState((previous) => ({ ...previous, processedCount: processed }));
      },
    });
    if (failedRows.length === 0) {
      closeDialog();
      return;
    }
    setDialogState((previous) => ({
      ...previous,
      open: true,
      mode: 'summary',
      busy: false,
      failedRows,
      updated,
      skipped,
      summaryMessage: buildCorrectSummaryMessage({ updated, skipped, failedCount: failedRows.length }),
    }));
    const matching = failedRows.find((row) => row.key === activeOrderKey);
    if (matching) {
      throw new Error(matching.errorMessage);
    }
  }, [closeDialog, runSingleUpdate]);

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

    const columnLabel = columnLabelByKey.get(payload.columnKey) || payload.columnKey || 'this column';
    const decision = await showDecisionDialog({ columnLabel, selectedCount: visibleSelectionCount });
    if (decision !== 'bulk') {
      await runSingleUpdate(mode, payload);
      return;
    }
    if (mode === 'correct') {
      await runBulkUpdateCorrect(payload, selectedVisibleOrders, activeOrderKey);
      return;
    }
    await runBulkUpdate({ mode, payload, rows: selectedVisibleOrders });
  }, [
    columnLabelByKey,
    runBulkUpdate,
    runBulkUpdateCorrect,
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

  const exposedDialogState = useMemo(
    () => ({ ...dialogState, retryingBulk: retry.retryingBulk }),
    [dialogState, retry.retryingBulk],
  );

  return useMemo(() => ({
    handleSaveValue,
    handleCorrectField,
    dialogState: exposedDialogState,
    dialogActions: {
      onOpenChange: handleDialogOpenChange,
      onChooseSingleCell: () => resolveDialogDecision('single'),
      onChooseBulk: () => resolveDialogDecision('bulk'),
      onCloseSummary: closeDialog,
      onRetryRow: retry.retryRow,
      onRetryAllFailed: retry.retryAllFailed,
    },
  }), [
    closeDialog,
    exposedDialogState,
    handleCorrectField,
    handleDialogOpenChange,
    handleSaveValue,
    resolveDialogDecision,
    retry.retryAllFailed,
    retry.retryRow,
  ]);
}
