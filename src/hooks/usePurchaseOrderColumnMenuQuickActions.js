import { useCallback } from 'react';

export function usePurchaseOrderColumnMenuQuickActions({
  column,
  writable,
  isLineColumnSummed,
  sumToggles,
  canToggleWriteback,
  canToggleLineTotal,
  canToggleGroupSummary,
  canToggleColumnSum,
  canPushLineTotalToHeader,
  canPushLineValuesToHeader,
  canToggleStickyAction,
  onToggleWriteback,
  onToggleLineColumnSum,
  onPushLineTotalToHeader,
  onPushLineValuesToHeader,
  onMakeColumnSticky,
  onToggleColumnCollapsed,
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

  const handleToggleGroupSummary = useCallback(() => {
    if (!canToggleGroupSummary) return;
    sumToggles?.onSetGroupSummaryColumn?.(column.key, !sumToggles.isGroupSummaryColumn);
    setOpen(false);
  }, [canToggleGroupSummary, column.key, setOpen, sumToggles]);

  const handleToggleColumnSum = useCallback(() => {
    if (!canToggleColumnSum) return;
    sumToggles?.onSetColumnSumColumn?.(column.key, !sumToggles.isColumnSumColumn);
  }, [canToggleColumnSum, column.key, sumToggles]);

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

  const handleHideColumn = useCallback(() => {
    if (typeof onToggleColumnCollapsed !== 'function') return;
    onToggleColumnCollapsed(column.key);
    setOpen(false);
  }, [column.key, onToggleColumnCollapsed, setOpen]);

  return {
    handleToggleWriteback,
    handleToggleLineTotal,
    handleToggleGroupSummary,
    handleToggleColumnSum,
    handlePushLineTotalToHeader,
    handlePushLineValuesToHeader,
    handleMakeColumnSticky,
    handleHideColumn,
  };
}
