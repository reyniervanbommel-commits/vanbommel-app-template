import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePurchaseOrderLineDetails, lineDetailsKey } from './usePurchaseOrderLineDetails';

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../utils/api', () => ({ apiRequest }));

const KEY = lineDetailsKey('nl01', 'PO-1');

describe('usePurchaseOrderLineDetails', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('haalt de regels van één order op en bewaart ze in board-vorm', async () => {
    apiRequest.mockResolvedValue({ details: [{ detailKey: 10, values: { qty: 5 }, isNew: true }] });
    const { result } = renderHook(() => usePurchaseOrderLineDetails());

    await act(async () => {
      await result.current.loadLines('nl01', 'PO-1');
    });

    expect(apiRequest).toHaveBeenCalledWith('/data/purchase-orders/rows/nl01/PO-1/details');
    const entry = result.current.entries.get(KEY);
    expect(entry.status).toBe('ready');
    expect(entry.lines).toEqual([{
      lineNumber: 10,
      values: { qty: 5 },
      historyByColumnId: {},
      trackMarksByColumnId: null,
      isNew: true,
      isChanged: false,
      isRemoved: false,
      changedFieldKeys: [],
    }]);
  });

  it('dedupet gelijktijdige aanvragen voor dezelfde order', async () => {
    apiRequest.mockResolvedValue({ details: [] });
    const { result } = renderHook(() => usePurchaseOrderLineDetails());

    await act(async () => {
      await Promise.all([
        result.current.loadLines('nl01', 'PO-1'),
        result.current.loadLines('nl01', 'PO-1'),
      ]);
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('bewaart de foutmelding zodat de opengeklapte rij die kan tonen', async () => {
    apiRequest.mockRejectedValue(new Error('Boom'));
    const { result } = renderHook(() => usePurchaseOrderLineDetails());

    await act(async () => {
      await result.current.loadLines('nl01', 'PO-1');
    });

    await waitFor(() => {
      expect(result.current.entries.get(KEY)).toMatchObject({ status: 'error', error: 'Boom', lines: null });
    });
  });

  it('past een celwijziging optimistisch toe en kan die terugdraaien', async () => {
    apiRequest.mockResolvedValue({ details: [{ detailKey: 10, values: { qty: 5 } }] });
    const { result } = renderHook(() => usePurchaseOrderLineDetails());
    await act(async () => {
      await result.current.loadLines('nl01', 'PO-1');
    });

    let previous = null;
    act(() => {
      previous = result.current.applyLineValues('nl01', 'PO-1', 10, (line) => ({
        ...line,
        values: { ...line.values, qty: 9 },
      }));
    });
    expect(result.current.entries.get(KEY).lines[0].values.qty).toBe(9);

    act(() => {
      result.current.restoreLines('nl01', 'PO-1', previous);
    });
    expect(result.current.entries.get(KEY).lines[0].values.qty).toBe(5);
  });

  it('gooit de cache leeg na een board-herlaad', async () => {
    apiRequest.mockResolvedValue({ details: [] });
    const { result } = renderHook(() => usePurchaseOrderLineDetails());
    await act(async () => {
      await result.current.loadLines('nl01', 'PO-1');
    });

    act(() => {
      result.current.resetLines();
    });

    expect(result.current.entries.size).toBe(0);
  });

  it('wist new/changed-flags op geladen regels en kan dat terugdraaien', async () => {
    apiRequest.mockResolvedValue({
      details: [{ detailKey: 10, values: { qty: 5 }, isNew: true, isChanged: false, isRemoved: true, changedFieldKeys: ['qty'] }],
    });
    const { result } = renderHook(() => usePurchaseOrderLineDetails());
    await act(async () => {
      await result.current.loadLines('nl01', 'PO-1');
    });

    let snapshot;
    act(() => {
      snapshot = result.current.clearUnseenLineFlags();
    });
    expect(result.current.entries.get(KEY).lines[0]).toMatchObject({
      isNew: false,
      isChanged: false,
      isRemoved: true,
      changedFieldKeys: [],
    });

    act(() => {
      result.current.restoreEntries(snapshot);
    });
    expect(result.current.entries.get(KEY).lines[0]).toMatchObject({
      isNew: true,
      isRemoved: true,
      changedFieldKeys: ['qty'],
    });
  });
});
