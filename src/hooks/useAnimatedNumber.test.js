// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANIMATED_NUMBER_MS, useAnimatedNumber } from './useAnimatedNumber';

function stubMatchMedia(matches) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

describe('useAnimatedNumber', () => {
  let frames;

  beforeEach(() => {
    frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the first target immediately', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useAnimatedNumber(1200));
    expect(result.current).toBe(1200);
    expect(frames).toHaveLength(0);
  });

  it('snaps when reduced motion is preferred', () => {
    stubMatchMedia(true);
    const { result, rerender } = renderHook(({ n }) => useAnimatedNumber(n), {
      initialProps: { n: 10 },
    });
    rerender({ n: 40 });
    expect(result.current).toBe(40);
  });

  it('tweens toward the new target then settles', () => {
    stubMatchMedia(false);
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const { result, rerender } = renderHook(({ n }) => useAnimatedNumber(n), {
      initialProps: { n: 10 },
    });
    act(() => {
      rerender({ n: 20 });
    });
    expect(frames).toHaveLength(1);

    now = ANIMATED_NUMBER_MS / 2;
    act(() => {
      frames.shift()(now);
    });
    expect(result.current).toBeGreaterThan(10);
    expect(result.current).toBeLessThan(20);

    now = ANIMATED_NUMBER_MS;
    act(() => {
      frames.shift()(now);
    });
    expect(result.current).toBe(20);
  });
});
