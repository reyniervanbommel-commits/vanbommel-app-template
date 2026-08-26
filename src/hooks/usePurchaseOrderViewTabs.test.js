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
    get filterByColumn() {
      return current.filterByColumn;
    },
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

  it('vraagt extra-filter scope nadat een extra tab-filter verandert', () => {
    const boardView = createBoardView();
    const { result, rerender } = renderHook(() => usePurchaseOrderViewTabs({
      activeViewId: 9,
      boardView,
      columns: [{ key: 'status', label: 'Status', dataType: 'text' }],
      allItems: [{ values: { status: 'Open' } }],
    }));

    act(() => {
      result.current.addBlankTab('Dates');
    });
    expect(result.current.extraFilterPrompt).toBe(0);

    act(() => {
      boardView.applyFilterSortGrouping({
        filterByColumn: { status: { operator: 'equals', value: 'Open', secondaryValue: '' } },
      });
    });
    rerender();

    expect(result.current.extraFilterPrompt).toBeGreaterThan(0);
  });

  it('verwijdert alle tabs van dezelfde groep', () => {
    const boardView = createBoardView();
    const { result } = renderHook(() => usePurchaseOrderViewTabs({
      activeViewId: 9,
      boardView,
      columns: [
        { key: 'vendorAccount', label: 'Vendor', dataType: 'text' },
      ],
      allItems: [
        { values: { vendorAccount: 'Q000104' } },
        { values: { vendorAccount: 'Q000105' } },
      ],
    }));

    act(() => {
      result.current.addTabsFromColumn({ columnKey: 'vendorAccount', color: '#579bfc' });
    });
    const firstId = result.current.extraTabs[0].id;
    expect(result.current.extraTabs).toHaveLength(2);

    act(() => {
      result.current.removeTab(firstId, 'group');
    });
    expect(result.current.extraTabs).toHaveLength(0);
    expect(result.current.activeTabId).toBe(ALL_TAB_ID);
  });
});
