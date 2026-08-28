// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));

import { apiRequest } from '../utils/api';
import { currentIsoWindow } from '../components/rccp/rccpUtils';
import { useRccpWindow } from './useRccpWindow';

const WIDE = { fromYear: 2021, fromWeek: 46, toYear: 2023, toWeek: 10 };
const COMPACT = { fromYear: 2026, fromWeek: 31, toYear: 2026, toWeek: 38 };

describe('useRccpWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({ settings: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores a stored multi-year window and keeps the compact default', async () => {
    apiRequest.mockImplementation((path) => {
      if (String(path).includes('/supplier/board-settings/rccp')) {
        return Promise.resolve({ settings: { isoWindow: WIDE, lastVendorAccount: 'V1' } });
      }
      return Promise.resolve({});
    });

    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.isoWindow).toEqual(currentIsoWindow(8));
    expect(result.current.lastVendor).toBe('V1');
  });

  it('does not persist a dataWindow jump', async () => {
    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    apiRequest.mockClear();

    act(() => {
      result.current.setIsoWindow(WIDE, { persist: false });
    });
    expect(result.current.isoWindow).toEqual(WIDE);

    await new Promise((resolve) => { setTimeout(resolve, 500); });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('persists a compact window, not the wide jump, when other settings save', async () => {
    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      result.current.setIsoWindow(COMPACT);
    });
    await waitFor(() => {
      expect(apiRequest.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(true);
    });
    apiRequest.mockClear();

    act(() => {
      result.current.setIsoWindow(WIDE, { persist: false });
    });
    act(() => {
      result.current.setLastVendor('V9');
    });
    await waitFor(() => {
      expect(apiRequest.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(true);
    });

    const patch = apiRequest.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(patch[1].body.settings.isoWindow).toEqual(COMPACT);
    expect(patch[1].body.settings.lastVendorAccount).toBe('V9');
  });
});
