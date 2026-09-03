import { startTransition, useCallback } from 'react';
import { isRemarksFilterOperatorReady } from '../utils/tableViewFilterUtils';

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
  columnDataType,
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

  const handleDraftValueChange = useCallback((nextValue) => {
    setDraft((prev) => ({ ...prev, value: nextValue }));
  }, [setDraft]);

  const handleSecondaryValueChange = useCallback((event) => {
    const nextValue = event.target.value;
    setDraft((prev) => ({ ...prev, secondaryValue: nextValue }));
  }, [setDraft]);

  const handleApplyFilter = useCallback(() => {
    if (columnDataType === 'remarks' && !isRemarksFilterOperatorReady(draft.operator, draft.value)) return;
    const isHasComment = columnDataType === 'remarks' && draft.operator === 'hasComment';
    const patch = {
      operator: draft.operator,
      value: isHasComment ? '' : draft.value,
      secondaryValue: isHasComment ? '' : draft.secondaryValue,
    };
    startTransition(() => {
      if (typeof onApplyFilter === 'function') {
        onApplyFilter(columnKey, patch);
      } else {
        onSetOperator(columnKey, draft.operator);
        persistDraftValues(
          columnKey,
          isHasComment ? { ...draft, value: '', secondaryValue: '' } : draft,
          onSetValue,
          onSetSecondaryValue
        );
      }
    });
    setOpen(false);
  }, [columnDataType, columnKey, draft, onApplyFilter, onSetOperator, onSetSecondaryValue, onSetValue, setOpen]);

  // Gebruikt voor auto-apply vanuit de value picker na een suggestie-klik.
  // Neemt de nieuwe waarde direct mee zodat de draft-closure niet stale is.
  // Sluit de popover NIET — de gebruiker moet het menu kunnen blijven gebruiken.
  const handleApplyFilterWithValue = useCallback((explicitValue) => {
    const patch = {
      operator: draft.operator,
      value: explicitValue,
      secondaryValue: draft.secondaryValue,
    };
    startTransition(() => {
      if (typeof onApplyFilter === 'function') {
        onApplyFilter(columnKey, patch);
      } else {
        onSetOperator(columnKey, draft.operator);
        onSetValue(columnKey, explicitValue);
        onSetSecondaryValue(columnKey, '');
      }
    });
  }, [columnKey, draft.operator, draft.secondaryValue, onApplyFilter, onSetOperator, onSetSecondaryValue, onSetValue]);

  // Sluit de popover NIET na clear — de gebruiker blijft in het menu.
  const handleClearFilter = useCallback(() => {
    onClearFilter(columnKey);
  }, [columnKey, onClearFilter]);

  return {
    setSortAsc,
    setSortDesc,
    clearSort,
    handleOperatorSelect,
    handleValueChange,
    handleDraftValueChange,
    handleSecondaryValueChange,
    handleApplyFilter,
    handleApplyFilterWithValue,
    handleClearFilter,
  };
}
