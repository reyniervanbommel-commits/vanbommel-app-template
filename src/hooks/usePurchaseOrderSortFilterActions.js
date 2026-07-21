import { startTransition, useCallback } from 'react';

function persistDraftValues(columnKey, draft, onSetValue, onSetSecondaryValue) {
  onSetValue(columnKey, draft.value);
  if (draft.operator === 'between') {
    onSetSecondaryValue(columnKey, draft.secondaryValue);
  } else {
    onSetSecondaryValue(columnKey, '');
  }
}

export function usePurchaseOrderSortFilterActions({
  columnKey,
  draft,
  onSetSortDirection,
  onSetOperator,
  onSetValue,
  onSetSecondaryValue,
  onApplyFilter,
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
    const nextOperator = data.optionValue;
    setDraft((prev) => ({ ...prev, operator: nextOperator }));
  }, [setDraft]);

  const handleValueChange = useCallback((event) => {
    const nextValue = event.target.value;
    setDraft((prev) => ({ ...prev, value: nextValue }));
  }, [setDraft]);

  const handleSecondaryValueChange = useCallback((event) => {
    const nextValue = event.target.value;
    setDraft((prev) => ({ ...prev, secondaryValue: nextValue }));
  }, [setDraft]);

  const handleApplyFilter = useCallback(() => {
    const patch = {
      operator: draft.operator,
      value: draft.value,
      secondaryValue: draft.secondaryValue,
    };
    startTransition(() => {
      if (typeof onApplyFilter === 'function') {
        onApplyFilter(columnKey, patch);
      } else {
        onSetOperator(columnKey, draft.operator);
        persistDraftValues(columnKey, draft, onSetValue, onSetSecondaryValue);
      }
    });
    setOpen(false);
  }, [columnKey, draft, onApplyFilter, onSetOperator, onSetSecondaryValue, onSetValue, setOpen]);

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
    handleApplyFilter,
    handleClearFilter,
  };
}
