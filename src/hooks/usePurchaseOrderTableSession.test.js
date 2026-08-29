// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readPoTableSession, savePoTableSession } from '../utils/poTableSessionState';

describe('usePurchaseOrderTableSession', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.resetModules();
  });

  async function loadHook() {
    const { usePurchaseOrderTableSession } = await import('./usePurchaseOrderTableSession');
    return usePurchaseOrderTableSession;
  }

  function createBoardView(snapshot) {
    return {
      filterByColumn: snapshot.filterByColumn,
      sortState: snapshot.sortState,
      groupingColumnKey: snapshot.grouping?.columnKey,
      groupingColor: null,
      groupSummaryColumnKeys: [],
      activityFilter: snapshot.activityFilter,
      columnSums: { columnSumKeys: snapshot.columnSumKeys || [] },
      exportFilterSortGrouping: () => snapshot,
      applyFilterSortGrouping: vi.fn(),
    };
  }

  it('overlays the stored snapshot after the view is applied', async () => {
    const usePurchaseOrderTableSession = await loadHook();
    const viewTable = { filterByColumn: {} };
    const session = { filterByColumn: { status: { operator: 'equals', value: 'Open' } } };
    savePoTableSession(7, session);
    const boardView = createBoardView(viewTable);
    const { result } = renderHook(() => usePurchaseOrderTableSession({ boardView, activeViewId: 7 }));

    act(() => {
      result.current.overlayAfter(7, () => {
        boardView.applyFilterSortGrouping(viewTable);
      });
    });

    expect(boardView.applyFilterSortGrouping).toHaveBeenNthCalledWith(1, viewTable);
    expect(boardView.applyFilterSortGrouping).toHaveBeenNthCalledWith(2, session);
  });

  it('does not persist the view defaults before hydrate, then saves live changes', async () => {
    const usePurchaseOrderTableSession = await loadHook();
    const live = {
      filterByColumn: { vendor: { operator: 'contains', value: 'Acme' } },
      sortState: { columnKey: 'vendor', direction: 'asc' },
      grouping: { columnKey: 'status' },
    };
    const boardView = createBoardView({ filterByColumn: {} });
    const { result, rerender } = renderHook(
      ({ view }) => usePurchaseOrderTableSession({ boardView: view, activeViewId: 7 }),
      { initialProps: { view: boardView } }
    );

    expect(readPoTableSession(7)).toBeNull();

    act(() => {
      result.current.enablePersist();
    });
    const liveView = createBoardView(live);
    rerender({ view: liveView });

    expect(readPoTableSession(7)).toEqual(live);
  });
});
