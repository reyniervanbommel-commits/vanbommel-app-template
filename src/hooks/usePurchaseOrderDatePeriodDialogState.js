import { useCallback, useMemo, useState } from 'react';

/**
 * Dialog state for creating Date W/M columns (derived from a date source column).
 */
export function usePurchaseOrderDatePeriodDialogState({
  availableColumns,
  addHeaderColumnAfter,
  setEditingColumnKey,
  setDatePeriodDisplayMode,
}) {
  const [dialogState, setDialogState] = useState({ open: false, sourceColumn: null });

  const closeDialog = useCallback(() => {
    setDialogState({ open: false, sourceColumn: null });
  }, []);

  const handleDatePeriodTypeSelection = useCallback((sourceColumn, typeDef) => {
    const typeKey = String(typeDef?.key || '').trim().toLowerCase();
    if (typeKey !== 'date_wm') return false;
    setDialogState({ open: true, sourceColumn });
    return true;
  }, []);

  const dateSourceColumns = useMemo(
    () => (Array.isArray(availableColumns) ? availableColumns : [])
      .filter((column) => String(column?.dataType || '').trim().toLowerCase() === 'date'),
    [availableColumns]
  );

  const submitDatePeriodColumn = useCallback(async ({ label, sourceColumnKey }) => {
    const anchorKey = String(dialogState.sourceColumn?.key || '').trim();
    if (!anchorKey || !sourceColumnKey) return;
    const created = await addHeaderColumnAfter(anchorKey, {
      label,
      dataType: 'date_period',
      options: { sourceColumnKey },
    });
    if (created?.key) {
      if (typeof setDatePeriodDisplayMode === 'function') {
        setDatePeriodDisplayMode(created.key, 'week');
      }
      setEditingColumnKey(created.key);
    }
  }, [addHeaderColumnAfter, dialogState.sourceColumn, setDatePeriodDisplayMode, setEditingColumnKey]);

  return {
    datePeriodDialogState: dialogState,
    closeDatePeriodDialog: closeDialog,
    handleDatePeriodTypeSelection,
    dateSourceColumns,
    submitDatePeriodColumn,
  };
}
