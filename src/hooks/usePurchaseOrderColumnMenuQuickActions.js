import { useCallback } from 'react';

export function usePurchaseOrderColumnMenuQuickActions({
  column,
  writable,
  isLineColumnSummed,
  canToggleWriteback,
  canToggleLineTotal,
  canPushLineTotalToHeader,
  canPushLineValuesToHeader,
  canToggleStickyAction,
  onToggleWriteback,
  onToggleLineColumnSum,
  onPushLineTotalToHeader,
  onPushLineValuesToHeader,
  onMakeColumnSticky,
  setOpen,
}) {
  const handleToggleWriteback = useCallback(() => {
    if (!canToggleWriteback) return;
    onToggleWriteback(column.id, !writable);
    setOpen(false);
  }, [canToggleWriteback, column.id, onToggleWriteback, setOpen, writable]);

  const handleToggleLineTotal = useCallback(() => {
    if (!canToggleLineTotal) return;
    onToggleLineColumnSum(column.key, !isLineColumnSummed);
    setOpen(false);
  }, [canToggleLineTotal, column.key, isLineColumnSummed, onToggleLineColumnSum, setOpen]);

  const handlePushLineTotalToHeader = useCallback(() => {
    if (!canPushLineTotalToHeader) return;
    onPushLineTotalToHeader(column);
    setOpen(false);
  }, [canPushLineTotalToHeader, column, onPushLineTotalToHeader, setOpen]);

  const handlePushLineValuesToHeader = useCallback(() => {
    if (!canPushLineValuesToHeader) return;
    onPushLineValuesToHeader(column);
    setOpen(false);
  }, [canPushLineValuesToHeader, column, onPushLineValuesToHeader, setOpen]);

  const handleMakeColumnSticky = useCallback(() => {
    if (!canToggleStickyAction) return;
    onMakeColumnSticky(column.key);
    setOpen(false);
  }, [canToggleStickyAction, column.key, onMakeColumnSticky, setOpen]);

  return {
    handleToggleWriteback,
    handleToggleLineTotal,
    handlePushLineTotalToHeader,
    handlePushLineValuesToHeader,
    handleMakeColumnSticky,
  };
}
