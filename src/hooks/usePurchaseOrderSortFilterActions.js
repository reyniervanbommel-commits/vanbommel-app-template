import { useCallback } from 'react';

export function usePurchaseOrderSortFilterActions({
  columnKey,
  draft,
  isDate,
  onSetSortDirection,
  onSetOperator,
  onSetValue,
  onSetSecondaryValue,
  onClearFilter,
  setDraft,
  setOpen,
}) {
  const setSortAsc = useCallback(() => {
    onSetSortDirection(columnKey, 'asc');
    setOpen(false);
  }, [columnKey, onSetSortDirection, setOpen]);

  const setSortDesc = useCallback(() => {
    onSetSortDirection(columnKey, 'desc');
    setOpen(false);
  }, [columnKey, onSetSortDirection, setOpen]);

  const clearSort = useCallback(() => {
    onSetSortDirection('', 'none');
    setOpen(false);
  }, [onSetSortDirection, setOpen]);

  const handleOperatorSelect = useCallback((_, data) => {
    if (!data.optionValue) return;
    setDraft((prev) => ({ ...prev, operator: data.optionValue }));
  }, [setDraft]);

  const handleValueChange = useCallback((event) => {
    const nextValue = event.target.value;
    setDraft((prev) => ({ ...prev, value: nextValue }));
  }, [setDraft]);

  const handleSecondaryValueChange = useCallback((event) => {
    const nextValue = event.target.value;
    setDraft((prev) => ({ ...prev, secondaryValue: nextValue }));
  }, [setDraft]);

  const handleApply = useCallback(() => {
    onSetOperator(columnKey, draft.operator);
    onSetValue(columnKey, draft.value);
    if (isDate && draft.operator === 'between') {
      onSetSecondaryValue(columnKey, draft.secondaryValue);
    } else {
      onSetSecondaryValue(columnKey, '');
    }
    setOpen(false);
  }, [columnKey, draft, isDate, onSetOperator, onSetSecondaryValue, onSetValue, setOpen]);

  const handleClearFilter = useCallback(() => {
    onClearFilter(columnKey);
    setOpen(false);
  }, [columnKey, onClearFilter, setOpen]);

  return {
    setSortAsc,
    setSortDesc,
    clearSort,
    handleOperatorSelect,
    handleValueChange,
    handleSecondaryValueChange,
    handleApply,
    handleClearFilter,
  };
}
