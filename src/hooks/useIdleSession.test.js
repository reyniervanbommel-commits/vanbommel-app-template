// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIdleSession } from './useIdleSession';

describe('useIdleSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opent de waarschuwing en roept daarna onIdle aan', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() => useIdleSession({
      enabled: true,
      idleMs: 1000,
      warningLeadMs: 400,
      onIdle,
    }));

    expect(result.current.warningOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.warningOpen).toBe(true);
    expect(onIdle).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('reset de timer bij echte gebruikersactiviteit', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() => useIdleSession({
      enabled: true,
      idleMs: 1000,
      warningLeadMs: 400,
      onIdle,
    }));

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.warningOpen).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(result.current.warningOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onIdle).not.toHaveBeenCalled();
    expect(result.current.warningOpen).toBe(true);
  });

  it('plant niets wanneer enabled false is', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleSession({
      enabled: false,
      idleMs: 100,
      warningLeadMs: 40,
      onIdle,
    }));

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onIdle).not.toHaveBeenCalled();
  });
});
