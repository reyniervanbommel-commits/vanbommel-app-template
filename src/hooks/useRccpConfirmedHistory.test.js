// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));

const window = { fromYear: 2026, fromWeek: 12, toYear: 2026, toWeek: 13 };

describe('useRccpConfirmedHistory', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not fetch when disabled or itemNumber is empty', async () => {
    const { apiRequest } = await import('../utils/api');
    apiRequest.mockResolvedValue({ itemNumber: 'SKU-1', versions: [] });
    const { useRccpConfirmedHistory } = await import('./useRccpConfirmedHistory');

    renderHook(() => useRccpConfirmedHistory({
      itemNumber: 'SKU-1',
      vendorAccount: 'V001',
      window,
      enabled: false,
    }));
    renderHook(() => useRccpConfirmedHistory({
      itemNumber: '',
      vendorAccount: 'V001',
      window,
      enabled: true,
    }));

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('fetches confirmed-history with item, vendor and window', async () => {
    const { apiRequest } = await import('../utils/api');
    apiRequest.mockResolvedValue({
      itemNumber: 'SKU-1',
      versions: [{ at: '2026-04-01T00:00:00.000Z', date: '2026-03-23T00:00:00.000Z' }],
    });
    const { useRccpConfirmedHistory } = await import('./useRccpConfirmedHistory');

    const { result } = renderHook(() => useRccpConfirmedHistory({
      itemNumber: 'SKU-1',
      vendorAccount: 'V001',
      window,
      enabled: true,
    }));

    await waitFor(() => expect(result.current.versions).toHaveLength(1));
    expect(apiRequest).toHaveBeenCalledTimes(1);
    const url = String(apiRequest.mock.calls[0][0]);
    expect(url).toContain('/rccp/confirmed-history');
    expect(url).toContain('itemNumber=SKU-1');
    expect(url).toContain('vendorAccount=V001');
    expect(url).toContain('fromYear=2026');
    expect(url).toContain('fromWeek=12');
  });
});
