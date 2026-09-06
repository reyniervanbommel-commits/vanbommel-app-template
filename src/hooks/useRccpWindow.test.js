// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));

import { apiRequest } from '../utils/api';
import { currentIsoWindow } from '../components/rccp/rccpUtils';
import { resetRccpWindowSync } from './rccpWindowSync';
import { useRccpWindow } from './useRccpWindow';

const WIDE = { fromYear: 2021, fromWeek: 46, toYear: 2023, toWeek: 10 };
const HUGE = { fromYear: 2018, fromWeek: 1, toYear: 2026, toWeek: 1 };
const COMPACT = { fromYear: 2026, fromWeek: 31, toYear: 2026, toWeek: 38 };
const QUARTER = { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 16 };
const DATA_WEEKS = { fromYear: 2021, fromWeek: 47, toYear: 2022, toWeek: 51 };

describe('useRccpWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRccpWindowSync();
    apiRequest.mockResolvedValue({ settings: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores a stored range longer than two years and keeps the compact default', async () => {
    apiRequest.mockImplementation((path) => {
      if (String(path).includes('/supplier/board-settings/rccp')) {
        return Promise.resolve({ settings: { isoWindow: HUGE, lastVendorAccount: 'V1' } });
      }
      return Promise.resolve({});
    });

    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.isoWindow).toEqual(currentIsoWindow(8));
    expect(result.current.lastVendor).toBe('V1');
  });

  it('loads a stored weeks-with-data period', async () => {
    apiRequest.mockImplementation((path) => {
      if (String(path).includes('/supplier/board-settings/rccp')) {
        return Promise.resolve({ settings: { isoWindow: DATA_WEEKS } });
      }
      return Promise.resolve({});
    });

    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.isoWindow).toEqual(DATA_WEEKS);
  });

  it('persists a weeks-with-data period', async () => {
    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    apiRequest.mockClear();

    act(() => {
      result.current.setIsoWindow(DATA_WEEKS);
    });
    await waitFor(() => {
      expect(apiRequest.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(true);
    });
    const patch = apiRequest.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(patch[1].body.settings.isoWindow).toEqual(DATA_WEEKS);
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
    expect(patch[1].body.settings.planningDateMode).toBe('requested');
  });

  it('loads a stored 16-week period instead of the compact default', async () => {
    apiRequest.mockImplementation((path) => {
      if (String(path).includes('/supplier/board-settings/rccp')) {
        return Promise.resolve({ settings: { isoWindow: QUARTER } });
      }
      return Promise.resolve({});
    });

    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.isoWindow).toEqual(QUARTER);
  });

  it('persists a 16-week user-chosen period', async () => {
    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    apiRequest.mockClear();

    act(() => {
      result.current.setIsoWindow(QUARTER);
    });
    await waitFor(() => {
      expect(apiRequest.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(true);
    });
    const patch = apiRequest.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(patch[1].body.settings.isoWindow).toEqual(QUARTER);
  });

  it('does not overwrite a user-chosen period with late-arriving stored settings', async () => {
    let resolveGet;
    apiRequest.mockImplementation((_path, options) => {
      if (options?.method === 'PATCH') return Promise.resolve({});
      return new Promise((resolve) => { resolveGet = resolve; });
    });

    const { result } = renderHook(() => useRccpWindow());
    act(() => {
      result.current.setIsoWindow(QUARTER);
    });
    expect(result.current.isoWindow).toEqual(QUARTER);

    await act(async () => {
      resolveGet({ settings: { isoWindow: COMPACT, lastVendorAccount: 'V1' } });
    });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.isoWindow).toEqual(QUARTER);
    expect(result.current.lastVendor).toBe('V1');
  });

  it('loads the legacy single load-date mode as a flag pair', async () => {
    apiRequest.mockImplementation((path) => {
      if (String(path).includes('/supplier/board-settings/rccp')) {
        return Promise.resolve({ settings: { planningDateMode: 'confirmed' } });
      }
      return Promise.resolve({});
    });

    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.planningDateModes).toEqual({ requested: false, confirmed: true });

    act(() => {
      result.current.setPlanningDateModes({ requested: true, confirmed: false });
    });
    await waitFor(() => {
      expect(apiRequest.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(true);
    });
    const patch = apiRequest.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(patch[1].body.settings.planningDateMode).toBe('requested');
    expect(patch[1].body.settings.planningDateModes).toEqual(['requested']);
  });

  it('loads and persists both load-date modes at once', async () => {
    apiRequest.mockImplementation((path) => {
      if (String(path).includes('/supplier/board-settings/rccp')) {
        return Promise.resolve({ settings: { planningDateModes: ['requested', 'confirmed'] } });
      }
      return Promise.resolve({});
    });

    const { result } = renderHook(() => useRccpWindow());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.planningDateModes).toEqual({ requested: true, confirmed: true });

    act(() => {
      result.current.setPlanningDateModes({ requested: false, confirmed: true });
    });
    await waitFor(() => {
      expect(apiRequest.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(true);
    });
    const patch = apiRequest.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(patch[1].body.settings.planningDateMode).toBe('confirmed');
    expect(patch[1].body.settings.planningDateModes).toEqual(['confirmed']);
  });

  it('shares a session-only wide window with a second keep-alive instance', async () => {
    const first = renderHook(() => useRccpWindow());
    const second = renderHook(() => useRccpWindow());
    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    await waitFor(() => expect(second.result.current.loaded).toBe(true));

    act(() => {
      first.result.current.setIsoWindow(WIDE, { persist: false });
    });
    expect(second.result.current.isoWindow).toEqual(WIDE);
  });
});
