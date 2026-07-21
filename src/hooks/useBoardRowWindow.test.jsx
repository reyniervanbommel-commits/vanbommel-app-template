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
});
