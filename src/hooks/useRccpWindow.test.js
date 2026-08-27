// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));

function lastPatchSettings(apiRequest) {
  const patchCalls = apiRequest.mock.calls.filter(([, options]) => options?.method === 'PATCH');
  return patchCalls.at(-1)?.[1]?.body?.settings;
}

describe('useRccpWindow', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('PATCH stuurt planningDate mee met de bestaande blob-velden', async () => {
    const { apiRequest } = await import('../utils/api');
    const stored = {
      isoWindow: { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8 },
      lastVendorAccount: 'V1',
      kpiWindowOnly: true,
      chartVisibleKeys: { quantity: true },
    };
    apiRequest.mockImplementation((url, options) => {
      if (options?.method === 'PATCH') return Promise.resolve({});
      return Promise.resolve({ settings: stored });
    });
    const { useRccpWindow } = await import('./useRccpWindow');

    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true), { timeout: 15000 });

    act(() => {
      result.current.planning.setDate('confirmed');
    });

    await waitFor(() => {
      expect(lastPatchSettings(apiRequest)).toEqual({
        isoWindow: stored.isoWindow,
        lastVendorAccount: stored.lastVendorAccount,
        kpiWindowOnly: stored.kpiWindowOnly,
        chartVisibleKeys: stored.chartVisibleKeys,
        planningDate: 'confirmed',
      });
    });
  }, 20000);

  it('leest planningDate uit board-settings; ongeldig valt terug op requested', async () => {
    const { apiRequest } = await import('../utils/api');
    apiRequest.mockResolvedValue({ settings: { planningDate: 'nope' } });
    const { useRccpWindow } = await import('./useRccpWindow');

    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true), { timeout: 15000 });
    expect(result.current.planning.date).toBe('requested');
  }, 20000);
});
