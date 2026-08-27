// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRccpWindow } from './useRccpWindow';
import { apiRequest } from '../utils/api';

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));

function lastPatchSettings() {
  const patchCalls = apiRequest.mock.calls.filter(([, options]) => options?.method === 'PATCH');
  return patchCalls.at(-1)?.[1]?.body?.settings;
}

describe('useRccpWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('PATCH stuurt planningDate mee met de bestaande blob-velden', async () => {
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

    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await waitFor(() => expect(result.current.lastVendor).toBe('V1'));

    act(() => {
      result.current.planning.setDate('confirmed');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(lastPatchSettings()).toEqual({
      isoWindow: stored.isoWindow,
      lastVendorAccount: stored.lastVendorAccount,
      kpiWindowOnly: stored.kpiWindowOnly,
      chartVisibleKeys: stored.chartVisibleKeys,
      planningDate: 'confirmed',
    });
  });

  it('leest planningDate uit board-settings; ongeldig valt terug op requested', async () => {
    apiRequest.mockResolvedValue({ settings: { planningDate: 'nope' } });

    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.planning.date).toBe('requested');
  });
});
