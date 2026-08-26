// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePurchaseOrderViewTabs } from './usePurchaseOrderViewTabs';
import { ALL_TAB_ID } from '../utils/viewTabs';

function createBoardView(filters = {}) {
  let current = { filterByColumn: filters, sortState: {}, grouping: {} };
  return {
    exportFilterSortGrouping: () => current,
    applyFilterSortGrouping: vi.fn((state) => {
      current = { ...current, ...state };
    }),
    allItems: [
      { values: { vendorAccount: 'Q000104', status: 'Invoiced' } },
      { values: { vendorAccount: 'Q000105', status: 'Invoiced' } },
    ],
  };
}

describe('usePurchaseOrderViewTabs', () => {
  it('voegt bulk-tabs toe zonder bestaande extra tabs te vervangen', () => {
    const boardView = createBoardView();
    const { result } = renderHook(() => usePurchaseOrderViewTabs({
      activeViewId: 9,
      boardView,
      columns: [
        { key: 'vendorAccount', label: 'Vendor', dataType: 'text' },
        { key: 'status', label: 'Status', dataType: 'text' },
      ],
      allItems: [
        { values: { vendorAccount: 'Q000104', status: 'Invoiced' } },
        { values: { vendorAccount: 'Q000105', status: 'Invoiced' } },
      ],
    }));

    act(() => {
      result.current.addBlankTab('Dates');
    });
    act(() => {
      result.current.addTabsFromColumn({ columnKey: 'vendorAccount', color: '#579bfc' });
    });

    expect(result.current.extraTabs.some((tab) => tab.name === 'Dates')).toBe(true);
    expect(result.current.extraTabs.filter((tab) => tab.groupColumnKey === 'vendorAccount').length).toBe(2);
    expect(result.current.groups[0].columnKey).toBe('vendorAccount');
    expect(result.current.activeTabId).not.toBe(ALL_TAB_ID);
  });
});
