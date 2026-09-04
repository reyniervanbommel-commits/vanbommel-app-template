// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../utils/api';
import { rowKey } from '../components/supplier/remarks/remarksFormatters';
import { usePurchaseOrderRemarksFilterBridge } from './usePurchaseOrderRemarksFilterBridge';

const { notifyError } = vi.hoisted(() => ({ notifyError: vi.fn() }));

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));
vi.mock('./useAppToast', () => ({
  useAppToast: () => ({ notifyError }),
}));

describe('usePurchaseOrderRemarksFilterBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stays disabled without contains + a valid term', () => {
    const { result, rerender } = renderHook(
      ({ filterByColumn }) => usePurchaseOrderRemarksFilterBridge(filterByColumn),
      { initialProps: { filterByColumn: { remarks: { operator: 'equals', value: 'delay' } } } }
    );

    expect(apiRequest).not.toHaveBeenCalled();
    expect(result.current.matchKeys).toBeNull();
    expect(result.current.enabled).toBe(false);

    rerender({ filterByColumn: { remarks: { operator: 'contains', value: 'a' } } });
    expect(apiRequest).not.toHaveBeenCalled();
    expect(result.current.enabled).toBe(false);
  });

  it('enables search for contains + a valid term', async () => {
    apiRequest.mockResolvedValueOnce({
      keys: [{ partitionKey: 'nl', recordKey: 'PO-1' }],
    });

    const { result } = renderHook(() =>
      usePurchaseOrderRemarksFilterBridge({
        remarks: { operator: 'contains', value: ' delay ' },
      })
    );

    expect(result.current.enabled).toBe(true);
    await waitFor(() => {
      expect(result.current.matchKeys).toEqual(new Set([rowKey('nl', 'PO-1')]));
    });
    expect(apiRequest.mock.calls[0][0]).toBe('/data/purchase-orders/remarks/search?q=delay');
  });

  it('enables hasComment without a search term', async () => {
    apiRequest.mockResolvedValueOnce({
      keys: [{ partitionKey: 'nl', recordKey: 'PO-1' }],
    });

    const { result } = renderHook(() =>
      usePurchaseOrderRemarksFilterBridge({
        remarks: { operator: 'hasComment', value: '' },
      })
    );

    expect(result.current.enabled).toBe(true);
    await waitFor(() => {
      expect(result.current.matchKeys).toEqual(new Set([rowKey('nl', 'PO-1')]));
    });
    expect(apiRequest.mock.calls[0][0]).toBe('/data/purchase-orders/remarks/has-comment');
  });

  it('toasts non-abort errors and skips AbortError', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    apiRequest
      .mockResolvedValueOnce({ keys: [{ partitionKey: 'nl', recordKey: 'PO-1' }] })
      .mockRejectedValueOnce(new Error('Search failed'))
      .mockResolvedValueOnce({ keys: [{ partitionKey: 'nl', recordKey: 'PO-1' }] })
      .mockRejectedValueOnce(abortError);

    const { result, rerender } = renderHook(
      ({ query }) => usePurchaseOrderRemarksFilterBridge({
        remarks: { operator: 'contains', value: query },
      }),
      { initialProps: { query: 'delay' } }
    );

    await waitFor(() => {
      expect(result.current.matchKeys).toEqual(new Set([rowKey('nl', 'PO-1')]));
    });

    rerender({ query: 'late' });
    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Search failed');
    });

    notifyError.mockClear();
    rerender({ query: 'hold' });
    await waitFor(() => {
      expect(result.current.matchKeys).toEqual(new Set([rowKey('nl', 'PO-1')]));
    });
    rerender({ query: 'next' });
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledTimes(4);
    });
    expect(notifyError).not.toHaveBeenCalled();
  });
});
