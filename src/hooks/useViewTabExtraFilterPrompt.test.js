import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewTabExtraFilterPrompt } from './useViewTabExtraFilterPrompt';

function createBoardView(filters = {}) {
  let current = { filterByColumn: filters };
  return {
    exportFilterSortGrouping: () => current,
    applyFilterSortGrouping: (state) => {
      current = { ...current, ...state };
    },
    get filterByColumn() {
      return current.filterByColumn;
    },
  };
}

describe('useViewTabExtraFilterPrompt', () => {
  it('telt geen prompt op de All-tab', () => {
    const extraTabsRef = { current: [] };
    const viewBaseRef = { current: {} };
    const boardView = createBoardView({ status: { operator: 'equals', value: 'Open' } });
    const { result } = renderHook(() => useViewTabExtraFilterPrompt({
      activeTabId: 'all',
      boardView,
      extraTabsRef,
      viewBaseRef,
    }));
    expect(result.current.extraFilterPrompt).toBe(0);
  });

  it('telt een prompt wanneer extra filters wijzigen', () => {
    const extraTabsRef = { current: [{ id: 'tab_1', extraFilters: {} }] };
    const viewBaseRef = { current: {} };
    const boardView = createBoardView();
    const { result, rerender } = renderHook(() => useViewTabExtraFilterPrompt({
      activeTabId: 'tab_1',
      boardView,
      extraTabsRef,
      viewBaseRef,
    }));

    act(() => {
      boardView.applyFilterSortGrouping({
        filterByColumn: { status: { operator: 'equals', value: 'Open', secondaryValue: '' } },
      });
    });
    rerender();
    expect(result.current.extraFilterPrompt).toBeGreaterThan(0);
  });
});
