import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePurchaseOrderColumnMenuQuickActions } from './usePurchaseOrderColumnMenuQuickActions';

function setup(overrides = {}) {
  const setOpen = vi.fn();
  const onSetColumnSumColumn = vi.fn();
  const { result } = renderHook(() => usePurchaseOrderColumnMenuQuickActions({
    column: { key: 'amount', id: 'amount-id' },
    writable: false,
    isLineColumnSummed: false,
    sumToggles: { isColumnSumColumn: false, onSetColumnSumColumn },
    canToggleWriteback: false,
    canToggleLineTotal: false,
    canToggleGroupSummary: false,
    canToggleColumnSum: true,
    canPushLineTotalToHeader: false,
    canPushLineValuesToHeader: false,
    canToggleStickyAction: false,
    onToggleWriteback: vi.fn(),
    onToggleLineColumnSum: vi.fn(),
    onPushLineTotalToHeader: vi.fn(),
    onPushLineValuesToHeader: vi.fn(),
    onMakeColumnSticky: vi.fn(),
    onToggleColumnCollapsed: vi.fn(),
    setOpen,
    ...overrides,
  }));
  return { result, setOpen, onSetColumnSumColumn };
}

describe('usePurchaseOrderColumnMenuQuickActions', () => {
  it('houdt het kolommenu open bij Show sum toggle', () => {
    const { result, setOpen, onSetColumnSumColumn } = setup();

    act(() => {
      result.current.handleToggleColumnSum();
    });

    expect(onSetColumnSumColumn).toHaveBeenCalledWith('amount', true);
    expect(setOpen).not.toHaveBeenCalled();
  });
});
