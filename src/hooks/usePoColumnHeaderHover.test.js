// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PO_HEADER_HOVER_DELAY_MS, usePoColumnHeaderHover } from './usePoColumnHeaderHover';

function makeCell(columnKey, extra = {}) {
  const cell = document.createElement('th');
  cell.setAttribute('data-col-key', columnKey);
  Object.entries(extra).forEach(([name, value]) => cell.setAttribute(name, value));
  cell.getBoundingClientRect = () => ({
    top: 10, bottom: 40, left: 80, right: 180, width: 100, height: 30,
  });
  return cell;
}

describe('usePoColumnHeaderHover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show a hover before the delay', () => {
    const { result } = renderHook(() => usePoColumnHeaderHover());
    const cell = makeCell('vendor');

    act(() => {
      result.current.enter(cell);
      vi.advanceTimersByTime(PO_HEADER_HOVER_DELAY_MS - 1);
    });

    expect(result.current.hover).toBe(null);
  });

  it('shows one hover after the delay, positioned below the cell', () => {
    const { result } = renderHook(() => usePoColumnHeaderHover());
    const cell = makeCell('vendor');

    act(() => {
      result.current.enter(cell);
      vi.advanceTimersByTime(PO_HEADER_HOVER_DELAY_MS);
    });

    expect(result.current.hover).toEqual({
      columnKey: 'vendor',
      top: 46,
      left: 80,
    });
  });

  it('hides immediately on leave and cancels a pending show', () => {
    const { result } = renderHook(() => usePoColumnHeaderHover());
    const cell = makeCell('vendor');

    act(() => {
      result.current.enter(cell);
      result.current.hide();
      vi.advanceTimersByTime(PO_HEADER_HOVER_DELAY_MS);
    });

    expect(result.current.hover).toBe(null);
  });

  it('ignores collapsed cells and a disabled hover', () => {
    const { result } = renderHook(() => usePoColumnHeaderHover({ disabled: true }));
    const cell = makeCell('vendor');

    act(() => {
      result.current.enter(cell);
      vi.advanceTimersByTime(PO_HEADER_HOVER_DELAY_MS);
    });
    expect(result.current.hover).toBe(null);

    const { result: enabled } = renderHook(() => usePoColumnHeaderHover());
    const collapsed = makeCell('vendor', { 'data-collapsed-column': 'true' });
    act(() => {
      enabled.current.enter(collapsed);
      vi.advanceTimersByTime(PO_HEADER_HOVER_DELAY_MS);
    });
    expect(enabled.current.hover).toBe(null);
  });
});
