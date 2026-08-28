// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const updateView = vi.fn(async () => ({ id: 7 }));
const createView = vi.fn(async ({ viewState }) => ({ id: 8, viewState }));
const apiRequest = vi.fn(async () => ({ settings: null }));

vi.mock('../utils/api', () => ({
  apiRequest: (...args) => apiRequest(...args),
}));

vi.mock('./usePurchaseOrderSavedViews', () => ({
  usePurchaseOrderSavedViews: () => ({
    views: [{ id: 7, name: 'My view', scope: 'personal', viewState: { showHistoryIndicators: true } }],
    loading: false,
    error: '',
    saving: false,
    reload: vi.fn(),
    createView,
    updateView,
    deleteView: vi.fn(),
  }),
}));

import { usePurchaseOrderSavedViewState } from './usePurchaseOrderSavedViewState';
import { ALL_ORDERS_SETTINGS_BOARD_KEY } from '../utils/allOrdersHistoryPreference';

function createBoardView() {
  return {
    exportFilterSortGrouping: () => ({}),
    applyFilterSortGrouping: vi.fn(),
    clearAllFilters: vi.fn(),
    clearSort: vi.fn(),
    clearGrouping: vi.fn(),
    clearGroupSummaries: vi.fn(),
    columnSums: { clearColumnSums: vi.fn() },
  };
}

function renderSavedViewState(boardView = createBoardView()) {
  return renderHook(() => usePurchaseOrderSavedViewState({
    orders: [{ id: 1 }],
    loading: false,
    exportColumnLayout: () => ({}),
    applyColumnLayout: vi.fn(),
    boardView,
    isSupplier: false,
  }));
}

describe('usePurchaseOrderSavedViewState All orders history toggle', () => {
  beforeEach(() => {
    updateView.mockClear();
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ settings: null });
  });

  it('zet history uit op All orders zonder een saved view te updaten', async () => {
    const { result } = renderSavedViewState();

    await act(async () => {
      await result.current.handleToggleShowHistory(null, false);
    });

    expect(result.current.showHistoryIndicators).toBe(false);
    expect(result.current.allOrdersShowHistoryIndicators).toBe(false);
    expect(updateView).not.toHaveBeenCalled();
    expect(apiRequest).toHaveBeenCalledWith(
      `/supplier/board-settings/${ALL_ORDERS_SETTINGS_BOARD_KEY}`,
      expect.objectContaining({
        method: 'PATCH',
        body: { settings: { allOrdersShowHistoryIndicators: false } },
      })
    );
  });

  it('houdt history uit na reset naar All orders', async () => {
    const boardView = createBoardView();
    const { result } = renderSavedViewState(boardView);

    await act(async () => {
      await result.current.handleToggleShowHistory(null, false);
    });
    await act(async () => {
      result.current.handleResetView();
    });

    expect(result.current.activeViewId).toBe(null);
    expect(result.current.showHistoryIndicators).toBe(false);
    expect(boardView.clearAllFilters).toHaveBeenCalled();
    expect(boardView.columnSums.clearColumnSums).toHaveBeenCalled();
  });

  it('wijzigt live history niet als All orders getoggeld wordt terwijl een andere view actief is', async () => {
    const { result } = renderSavedViewState();

    await act(async () => {
      result.current.applyViewState({
        id: 7,
        viewState: { showHistoryIndicators: true, columns: {}, table: {} },
      });
    });
    await act(async () => {
      await result.current.handleToggleShowHistory({ id: null }, false);
    });

    expect(result.current.showHistoryIndicators).toBe(true);
    expect(result.current.allOrdersShowHistoryIndicators).toBe(false);
    expect(result.current.activeViewId).toBe(7);
  });
});

describe('usePurchaseOrderSavedViewState columnSumKeys', () => {
  beforeEach(() => {
    updateView.mockClear();
    createView.mockClear();
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ settings: null });
  });

  it('neemt columnSumKeys op in de view-state bij opslaan', async () => {
    const boardView = createBoardView();
    boardView.exportFilterSortGrouping = () => ({
      filterByColumn: {},
      sortState: { columnKey: '', direction: 'none' },
      grouping: {},
      columnSumKeys: ['amount'],
    });
    const { result } = renderSavedViewState(boardView);

    await act(async () => {
      await result.current.handleUpdateActive({ id: 7 });
    });
    expect(updateView).toHaveBeenCalledWith(7, expect.objectContaining({
      viewState: expect.objectContaining({
        table: expect.objectContaining({ columnSumKeys: ['amount'] }),
      }),
    }));

    await act(async () => {
      await result.current.handleSaveAsNew({ name: 'Sums', scope: 'personal' });
    });
    expect(createView).toHaveBeenCalledWith(expect.objectContaining({
      viewState: expect.objectContaining({
        table: expect.objectContaining({ columnSumKeys: ['amount'] }),
      }),
    }));
  });

  it('past columnSumKeys uit de opgeslagen view toe', () => {
    const boardView = createBoardView();
    const { result } = renderSavedViewState(boardView);

    act(() => {
      result.current.applyViewState({
        id: 7,
        viewState: {
          columns: {},
          table: { columnSumKeys: ['amount'] },
        },
      });
    });

    expect(boardView.applyFilterSortGrouping).toHaveBeenCalledWith(
      expect.objectContaining({ columnSumKeys: ['amount'] })
    );
  });
});
