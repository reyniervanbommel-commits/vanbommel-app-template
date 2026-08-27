// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../utils/api';
import { rowKey } from './remarksFormatters';
import { useRemarksColumnFilter } from './useRemarksColumnFilter';

vi.mock('../../../utils/api', () => ({ apiRequest: vi.fn() }));

describe('useRemarksColumnFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch when disabled and keeps matchKeys null', () => {
    const { result } = renderHook(() =>
      useRemarksColumnFilter({ query: 'delay', enabled: false })
    );

    expect(apiRequest).not.toHaveBeenCalled();
    expect(result.current.matchKeys).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('loads a Set of rowKeys from GET remarks/search?q=delay', async () => {
    apiRequest.mockResolvedValueOnce({
      keys: [
        { partitionKey: 'nl', recordKey: 'PO-1' },
        { partitionKey: 'be', recordKey: 'PO-2' },
      ],
    });

    const { result } = renderHook(() =>
      useRemarksColumnFilter({ query: 'delay', enabled: true })
    );

    expect(result.current.matchKeys).toBeNull();
    await waitFor(() => {
      expect(result.current.matchKeys).toEqual(new Set([
        rowKey('nl', 'PO-1'),
        rowKey('be', 'PO-2'),
      ]));
    });
    expect(apiRequest).toHaveBeenCalledWith(
      '/data/purchase-orders/remarks/search?q=delay',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('keeps the previous Set when a later request fails', async () => {
    apiRequest
      .mockResolvedValueOnce({ keys: [{ partitionKey: 'nl', recordKey: 'PO-1' }] })
      .mockRejectedValueOnce(new Error('Search failed'));

    const { result, rerender } = renderHook(
      ({ query }) => useRemarksColumnFilter({ query, enabled: true }),
      { initialProps: { query: 'delay' } }
    );

    await waitFor(() => {
      expect(result.current.matchKeys).toEqual(new Set([rowKey('nl', 'PO-1')]));
    });

    rerender({ query: 'late' });
    await waitFor(() => {
      expect(result.current.error).toBe('Search failed');
    });
    expect(result.current.matchKeys).toEqual(new Set([rowKey('nl', 'PO-1')]));
  });

  it('does not set error on AbortError', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    apiRequest
      .mockResolvedValueOnce({ keys: [{ partitionKey: 'nl', recordKey: 'PO-1' }] })
      .mockRejectedValueOnce(abortError);

    const { result, rerender } = renderHook(
      ({ query }) => useRemarksColumnFilter({ query, enabled: true }),
      { initialProps: { query: 'delay' } }
    );

    await waitFor(() => {
      expect(result.current.matchKeys).toEqual(new Set([rowKey('nl', 'PO-1')]));
    });

    rerender({ query: 'late' });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('');
    expect(result.current.matchKeys).toEqual(new Set([rowKey('nl', 'PO-1')]));
  });

  it('aborts the previous request when the query changes', async () => {
    let resolveFirst;
    apiRequest.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFirst = resolve; })
    );
    apiRequest.mockResolvedValueOnce({
      keys: [{ partitionKey: 'nl', recordKey: 'PO-2' }],
    });

    const { result, rerender } = renderHook(
      ({ query }) => useRemarksColumnFilter({ query, enabled: true }),
      { initialProps: { query: 'delay' } }
    );

    expect(apiRequest).toHaveBeenCalledTimes(1);
    const firstSignal = apiRequest.mock.calls[0][1].signal;

    rerender({ query: 'late' });
    expect(firstSignal.aborted).toBe(true);
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest.mock.calls[1][0]).toBe('/data/purchase-orders/remarks/search?q=late');

    resolveFirst({ keys: [{ partitionKey: 'nl', recordKey: 'PO-1' }] });
    await waitFor(() => {
      expect(result.current.matchKeys).toEqual(new Set([rowKey('nl', 'PO-2')]));
    });
    expect(result.current.error).toBe('');
  });

  it('clears matchKeys when the filter is turned off', async () => {
    apiRequest.mockResolvedValue({
      keys: [{ partitionKey: 'nl', recordKey: 'PO-1' }],
    });

    const { result, rerender } = renderHook(
      ({ enabled }) => useRemarksColumnFilter({ query: 'delay', enabled }),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => {
      expect(result.current.matchKeys).toEqual(new Set([rowKey('nl', 'PO-1')]));
    });

    rerender({ enabled: false });
    expect(result.current.matchKeys).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });
});
