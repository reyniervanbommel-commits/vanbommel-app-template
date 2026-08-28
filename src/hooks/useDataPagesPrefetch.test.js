// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('./usePageActive', () => ({ usePageActive: vi.fn(() => true) }));
vi.mock('./useRccpWindow', () => ({
  useRccpWindow: vi.fn(() => ({ isoWindow: { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8 }, lastVendor: 'V1', loaded: true })),
}));
vi.mock('../utils/idleWhenQuiet', () => ({ runWhenIdleAndQuiet: vi.fn(() => ({ cancel: vi.fn() })) }));
vi.mock('../utils/dataPagesPrefetch', () => ({
  startDataPagesPrefetch: vi.fn(),
  setDataPagesPrefetchParams: vi.fn(),
}));

import { usePageActive } from './usePageActive';
import { useRccpWindow } from './useRccpWindow';
import { runWhenIdleAndQuiet } from '../utils/idleWhenQuiet';
import { startDataPagesPrefetch, setDataPagesPrefetchParams } from '../utils/dataPagesPrefetch';
import { useDataPagesPrefetch } from './useDataPagesPrefetch';

describe('useDataPagesPrefetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePageActive.mockReturnValue(true);
    useRccpWindow.mockReturnValue({
      isoWindow: { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8 }, lastVendor: 'V1', loaded: true,
    });
    runWhenIdleAndQuiet.mockImplementation((cb) => { cb(); return { cancel: vi.fn() }; });
  });

  it('arms runWhenIdleAndQuiet and starts the prefetch once enabled, active and loaded', () => {
    renderHook(() => useDataPagesPrefetch({ enabled: true, refreshKey: 'r1', isSupplier: false }));

    expect(runWhenIdleAndQuiet).toHaveBeenCalledTimes(1);
    expect(startDataPagesPrefetch).toHaveBeenCalledWith({
      refreshKey: 'r1', lastVendor: 'V1', isoWindow: { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8 }, isSupplier: false,
    });
  });

  it('does nothing while not enabled (skeleton / no successful board read yet)', () => {
    renderHook(() => useDataPagesPrefetch({ enabled: false, refreshKey: 'r1' }));
    expect(runWhenIdleAndQuiet).not.toHaveBeenCalled();
  });

  it('starts prefetch immediately when the PO page is hidden instead of waiting for idle', () => {
    usePageActive.mockReturnValue(false);
    renderHook(() => useDataPagesPrefetch({ enabled: true, refreshKey: 'r1' }));
    expect(runWhenIdleAndQuiet).not.toHaveBeenCalled();
    expect(startDataPagesPrefetch).toHaveBeenCalledWith({
      refreshKey: 'r1', lastVendor: 'V1', isoWindow: { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8 }, isSupplier: false,
    });
  });

  it('kicks prefetch when the page becomes inactive instead of dropping a pending idle wait', () => {
    const cancel = vi.fn();
    runWhenIdleAndQuiet.mockImplementation(() => ({ cancel }));
    const { rerender } = renderHook(() => useDataPagesPrefetch({ enabled: true, refreshKey: 'r1' }));
    expect(startDataPagesPrefetch).not.toHaveBeenCalled();

    usePageActive.mockReturnValue(false);
    rerender();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(startDataPagesPrefetch).toHaveBeenCalledWith({
      refreshKey: 'r1', lastVendor: 'V1', isoWindow: { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8 }, isSupplier: false,
    });
  });

  it('does nothing before the RCCP window settings have loaded', () => {
    useRccpWindow.mockReturnValue({ isoWindow: null, lastVendor: '', loaded: false });
    renderHook(() => useDataPagesPrefetch({ enabled: true, refreshKey: 'r1' }));
    expect(runWhenIdleAndQuiet).not.toHaveBeenCalled();
  });

  it('does nothing without a refreshKey', () => {
    renderHook(() => useDataPagesPrefetch({ enabled: true, refreshKey: '' }));
    expect(runWhenIdleAndQuiet).not.toHaveBeenCalled();
  });

  it('records the current params for the rail-hover kick even while not yet enabled', () => {
    renderHook(() => useDataPagesPrefetch({ enabled: false, refreshKey: 'r1', isSupplier: true }));

    expect(setDataPagesPrefetchParams).toHaveBeenCalledWith({
      refreshKey: 'r1', lastVendor: 'V1', isoWindow: { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8 }, isSupplier: true,
    });
    expect(startDataPagesPrefetch).not.toHaveBeenCalled();
  });

  it('cancels the pending idle handle on unmount', () => {
    const cancel = vi.fn();
    runWhenIdleAndQuiet.mockReturnValue({ cancel });
    const { unmount } = renderHook(() => useDataPagesPrefetch({ enabled: true, refreshKey: 'r1' }));
    unmount();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
