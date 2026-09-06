// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  computeRccpYScaleFactor,
  scaleRccpYDomain,
  useRccpChartYScale,
  RCCP_Y_SCALE_LONG_PRESS_MS,
  RCCP_Y_SCALE_MIN_FACTOR,
  RCCP_Y_SCALE_MAX_FACTOR,
  RCCP_Y_SCALE_PIXELS_PER_DOUBLING,
} from './useRccpChartYScale';

describe('computeRccpYScaleFactor', () => {
  it('zooms in when dragging up (negative deltaY) and out when dragging down', () => {
    const doubling = RCCP_Y_SCALE_PIXELS_PER_DOUBLING;
    expect(computeRccpYScaleFactor(1, -doubling)).toBeCloseTo(2, 5);
    expect(computeRccpYScaleFactor(1, doubling)).toBeCloseTo(0.5, 5);
    expect(computeRccpYScaleFactor(1, 0)).toBeCloseTo(1, 5);
  });

  it('clamps to the min/max factor', () => {
    expect(computeRccpYScaleFactor(1, 10000)).toBeCloseTo(RCCP_Y_SCALE_MIN_FACTOR, 5);
    expect(computeRccpYScaleFactor(1, -10000)).toBeCloseTo(RCCP_Y_SCALE_MAX_FACTOR, 5);
  });
});

describe('scaleRccpYDomain', () => {
  it('leaves the domain unchanged at factor 1', () => {
    expect(scaleRccpYDomain([-100, 100], 1)).toEqual([-100, 100]);
  });

  it('shrinks the domain when zoomed in (factor > 1)', () => {
    expect(scaleRccpYDomain([0, 200], 2)).toEqual([0, 100]);
  });

  it('grows the domain when zoomed out (factor < 1)', () => {
    expect(scaleRccpYDomain([-100, 100], 0.5)).toEqual([-200, 200]);
  });

  it('falls back to [0, 1] for an invalid domain', () => {
    expect(scaleRccpYDomain(null, 2)).toEqual([0, 0.5]);
  });
});

function pointerEvent({ pointerId = 1, clientY = 0, pointerType = 'mouse', button = 0 } = {}) {
  return { pointerId, clientY, pointerType, button, currentTarget: { setPointerCapture: vi.fn() } };
}

describe('useRccpChartYScale', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at auto-fit with no drag active', () => {
    const { result } = renderHook(() => useRccpChartYScale([0, 100]));
    expect(result.current.yDomain).toEqual([0, 100]);
    expect(result.current.isDragging).toBe(false);
    expect(result.current.isScaled).toBe(false);
    expect(result.current.zoomPercent).toBe(100);
  });

  it('does not start dragging before the long-press threshold', () => {
    const { result } = renderHook(() => useRccpChartYScale([0, 100]));
    act(() => {
      result.current.dragHandlers.onPointerDown(pointerEvent({ clientY: 0 }));
      vi.advanceTimersByTime(RCCP_Y_SCALE_LONG_PRESS_MS - 50);
    });
    expect(result.current.isDragging).toBe(false);
  });

  it('does not cancel the long-press on pre-arm jitter, and re-baselines so it does not jump', () => {
    const { result } = renderHook(() => useRccpChartYScale([0, 100]));
    act(() => {
      result.current.dragHandlers.onPointerDown(pointerEvent({ clientY: 0 }));
      // A real hold always wobbles a few px before the threshold — this must not cancel it.
      result.current.dragHandlers.onPointerMove(pointerEvent({ clientY: 30 }));
      vi.advanceTimersByTime(RCCP_Y_SCALE_LONG_PRESS_MS);
    });
    expect(result.current.isDragging).toBe(true);
    // Re-baselined to the last pre-arm position: no jump from that wobble.
    expect(result.current.yDomain).toEqual([0, 100]);

    act(() => {
      result.current.dragHandlers.onPointerMove(
        pointerEvent({ clientY: 30 - RCCP_Y_SCALE_PIXELS_PER_DOUBLING }),
      );
    });
    expect(result.current.zoomPercent).toBe(200);
  });

  it('cancels the gesture when the pointer is released before the long-press fires', () => {
    const { result } = renderHook(() => useRccpChartYScale([0, 100]));
    act(() => {
      result.current.dragHandlers.onPointerDown(pointerEvent({ clientY: 0 }));
      vi.advanceTimersByTime(RCCP_Y_SCALE_LONG_PRESS_MS - 50);
      result.current.dragHandlers.onPointerUp(pointerEvent({ clientY: 0 }));
      vi.advanceTimersByTime(100);
    });
    expect(result.current.isDragging).toBe(false);
    expect(result.current.yDomain).toEqual([0, 100]);
  });

  it('zooms in while dragging up after the long-press fires', () => {
    const { result } = renderHook(() => useRccpChartYScale([0, 100]));
    act(() => {
      result.current.dragHandlers.onPointerDown(pointerEvent({ clientY: 0 }));
      vi.advanceTimersByTime(RCCP_Y_SCALE_LONG_PRESS_MS);
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.dragHandlers.onPointerMove(
        pointerEvent({ clientY: -RCCP_Y_SCALE_PIXELS_PER_DOUBLING }),
      );
    });
    expect(result.current.zoomPercent).toBe(200);
    expect(result.current.yDomain).toEqual([0, 50]);
    expect(result.current.isScaled).toBe(true);

    act(() => {
      result.current.dragHandlers.onPointerUp(
        pointerEvent({ clientY: -RCCP_Y_SCALE_PIXELS_PER_DOUBLING }),
      );
    });
    expect(result.current.isDragging).toBe(false);
    // Ending the drag keeps the last factor.
    expect(result.current.zoomPercent).toBe(200);
  });

  it('resets to auto-fit on double-click', () => {
    const { result } = renderHook(() => useRccpChartYScale([0, 100]));
    act(() => {
      result.current.dragHandlers.onPointerDown(pointerEvent({ clientY: 0 }));
      vi.advanceTimersByTime(RCCP_Y_SCALE_LONG_PRESS_MS);
      result.current.dragHandlers.onPointerMove(pointerEvent({ clientY: -200 }));
      result.current.dragHandlers.onPointerUp(pointerEvent({ clientY: -200 }));
    });
    expect(result.current.isScaled).toBe(true);

    act(() => {
      result.current.dragHandlers.onDoubleClick();
    });
    expect(result.current.isScaled).toBe(false);
    expect(result.current.yDomain).toEqual([0, 100]);
  });
});
