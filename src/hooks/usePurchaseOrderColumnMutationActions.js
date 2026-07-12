import { useCallback, useMemo, useState } from 'react';
import { useAppToast } from './useAppToast';

export function usePurchaseOrderColumnMutationActions({
  column,
  canRenameColumn,
  canRemoveColumn,
  onRenameColumn,
  onRemoveColumn,
  onCloseMenu,
}) {
  const { notifyError } = useAppToast();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);

  const handleRenameColumn = useCallback(() => {
    if (!canRenameColumn) return;
    setRenameValue(String(column?.label || ''));
    setRenameOpen(true);
  }, [canRenameColumn, column?.label]);

  const handleRenameCancel = useCallback(() => {
    if (renameBusy) return;
    setRenameOpen(false);
  }, [renameBusy]);

  const handleRenameSubmit = useCallback(async () => {
    if (!canRenameColumn || renameBusy) return;
    const trimmed = String(renameValue || '').trim();
    if (!trimmed || trimmed === String(column?.label || '').trim()) {
      setRenameOpen(false);
      return;
    }
    setRenameBusy(true);
    try {
      await onRenameColumn(column.id, trimmed);
      setRenameOpen(false);
      onCloseMenu();
    } catch (err) {
      notifyError(err?.message || 'Renaming the column failed.');
    } finally {
      setRenameBusy(false);
    }
  }, [canRenameColumn, column?.id, column?.label, onCloseMenu, onRenameColumn, notifyError, renameBusy, renameValue]);

  const handleRemoveColumn = useCallback(() => {
    if (!canRemoveColumn) return;
    setRemoveOpen(true);
  }, [canRemoveColumn]);

  const handleRemoveCancel = useCallback(() => {
    if (removeBusy) return;
    setRemoveOpen(false);
  }, [removeBusy]);

  const handleRemoveConfirm = useCallback(async () => {
    if (!canRemoveColumn || removeBusy) return;
    setRemoveBusy(true);
    try {
      await onRemoveColumn(column.id);
      setRemoveOpen(false);
      onCloseMenu();
    } catch (err) {
      notifyError(err?.message || 'Deleting the column failed.');
    } finally {
      setRemoveBusy(false);
    }
  }, [canRemoveColumn, column?.id, onCloseMenu, onRemoveColumn, notifyError, removeBusy]);

  const dialogState = useMemo(() => ({
    renameOpen,
    renameValue,
    renameBusy,
    removeOpen,
    removeBusy,
  }), [renameBusy, renameOpen, renameValue, removeBusy, removeOpen]);

  return {
    dialogState,
    setRenameValue,
    handleRenameColumn,
    handleRenameCancel,
    handleRenameSubmit,
    handleRemoveColumn,
    handleRemoveCancel,
    handleRemoveConfirm,
  };
}
