import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePurchaseOrderSortFilterActions } from './usePurchaseOrderSortFilterActions';

function setup(draft = { operator: 'oneOf', value: [], secondaryValue: '' }) {
  const setDraft = vi.fn((updater) => updater(draft));
  const { result } = renderHook(() => usePurchaseOrderSortFilterActions({
    columnKey: 'vendor',
    draft,
    onSetSortDirection: vi.fn(),
    onSetOperator: vi.fn(),
    onSetValue: vi.fn(),
    onSetSecondaryValue: vi.fn(),
    onApplyFilter: vi.fn(),
    onClearFilter: vi.fn(),
    setDraft,
    setOpen: vi.fn(),
  }));
  return { result, setDraft };
}

describe('usePurchaseOrderSortFilterActions — handleDraftValueChange', () => {
  it('zet draft.value direct op de meegegeven array-waarde', () => {
    const { result, setDraft } = setup();
    act(() => {
      result.current.handleDraftValueChange(['Acme', 'Beta']);
    });
    expect(setDraft).toHaveBeenCalled();
    const updater = setDraft.mock.calls[0][0];
    expect(updater({ operator: 'oneOf', value: [], secondaryValue: '' })).toEqual({
      operator: 'oneOf',
      value: ['Acme', 'Beta'],
      secondaryValue: '',
    });
  });
});
