// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePurchaseOrderRowLocate } from './usePurchaseOrderRowLocate';

describe('usePurchaseOrderRowLocate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('scrollt naar de rij en zet een highlight wanneer de rij zichtbaar is', () => {
    const wrapper = document.createElement('div');
    const row = document.createElement('tr');
    row.dataset.locateKey = 'USMF|PO-1';
    row.scrollIntoView = vi.fn();
    wrapper.appendChild(row);

    const groupedRows = [{
      groupKey: 'all-rows',
      ancestorGroupKeys: [],
      entries: [{ order: { dataAreaId: 'USMF', orderNumber: 'PO-1' } }],
    }];

    const { result } = renderHook(() => usePurchaseOrderRowLocate({
      groupedRows,
      collapsedGroups: {},
      ensureGroupsExpanded: vi.fn(),
      tableWrapperRef: { current: wrapper },
      locateRequest: { partitionKey: 'USMF', recordKey: 'PO-1', seq: 1 },
    }));

    act(() => {
      vi.runAllTimers();
    });

    expect(row.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    expect(result.current).toBe('USMF|PO-1');
  });
});
