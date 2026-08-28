import { describe, expect, it, vi } from 'vitest';
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
  it('roept geen sync op de All-tab', () => {
    const extraTabsRef = { current: [] };
    const viewBaseRef = { current: {} };
    const onExtraChange = vi.fn();
    const boardView = createBoardView({ status: { operator: 'equals', value: 'Open' } });
    renderHook(() => useViewTabExtraFilterPrompt({
      activeTabId: 'all',
      boardView,
      extraTabsRef,
      viewBaseRef,
      onExtraChange,
    }));
    expect(onExtraChange).not.toHaveBeenCalled();
  });

  it('synchroniseert extra filters wanneer ze wijzigen', () => {
    const extraTabsRef = { current: [{ id: 'tab_1', extraFilters: {} }] };
    const viewBaseRef = { current: {} };
    const onExtraChange = vi.fn();
    const boardView = createBoardView();
    const { rerender } = renderHook(() => useViewTabExtraFilterPrompt({
      activeTabId: 'tab_1',
      boardView,
      extraTabsRef,
      viewBaseRef,
      onExtraChange,
    }));

    act(() => {
      boardView.applyFilterSortGrouping({
        filterByColumn: { status: { operator: 'equals', value: 'Open', secondaryValue: '' } },
      });
    });
    rerender();
    expect(onExtraChange).toHaveBeenCalled();
  });
});
