import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBoardRowWindow } from './useBoardRowWindow';

describe('useBoardRowWindow', () => {
  it('mounts a small initial window when enabled', () => {
    const scrollRef = { current: null };
    const { result } = renderHook(() => useBoardRowWindow({
      scrollRef,
      totalCount: 2000,
      rowHeightPx: 32,
      overscan: 12,
      enabled: true,
    }));
    expect(result.current.start).toBe(0);
    expect(result.current.end).toBeLessThan(2000);
    expect(result.current.bottomPadPx).toBeGreaterThan(0);
  });

  it('mounts everything when disabled', () => {
    const scrollRef = { current: null };
    const { result } = renderHook(() => useBoardRowWindow({
      scrollRef,
      totalCount: 200,
      rowHeightPx: 32,
      enabled: false,
    }));
    expect(result.current).toEqual({
      start: 0,
      end: 200,
      topPadPx: 0,
      bottomPadPx: 0,
    });
  });

  it('scales spacer pads when getScale is 0.85', () => {
    const makeEl = (clientHeight = 320) => ({
      scrollTop: 0,
      clientHeight,
      addEventListener() {},
      removeEventListener() {},
    });
    const { result } = renderHook(() => useBoardRowWindow({
      scrollRef: { current: makeEl() },
      totalCount: 100,
      rowHeightPx: 32,
      overscan: 0,
      enabled: true,
      getScale: () => 0.85,
    }));
    const unscaled = renderHook(() => useBoardRowWindow({
      scrollRef: { current: makeEl(320 / 0.85) },
      totalCount: 100,
      rowHeightPx: 32,
      overscan: 0,
      enabled: true,
    }));
    expect(result.current.bottomPadPx).toBeGreaterThan(0);
    expect(result.current.bottomPadPx).toBeCloseTo(unscaled.result.current.bottomPadPx * 0.85, 0);
  });
});
