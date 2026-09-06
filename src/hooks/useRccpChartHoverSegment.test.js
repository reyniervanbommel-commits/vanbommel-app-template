// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRccpChartHoverSegment } from './useRccpChartHoverSegment';

const chart = [
  {
    key: '2026-W10',
    segmentsAbove: [{ itemNumber: 'CFM-1', qty: 4, status: 'open' }],
  },
];

describe('useRccpChartHoverSegment', () => {
  it('falls back to the item-focus highlight without a hover', () => {
    const { result } = renderHook(() => useRccpChartHoverSegment({
      chart,
      itemFocus: { item: 'CFM-1', onSelect: vi.fn() },
    }));
    expect(result.current.highlightItem).toBe('CFM-1');
    expect(result.current.hoveredSegment).toBeNull();
  });

  it('positions the hover card and highlights the hovered received/ordered item', () => {
    const { result } = renderHook(() => useRccpChartHoverSegment({ chart }));
    act(() => {
      result.current.hoverBoxRef.current = { style: {} };
      result.current.hoverValue.onHover({
        x: 10, y: 20, segment: { itemNumber: 'CFM-2', status: 'received' },
      });
    });
    expect(result.current.hoveredSegment.segment.itemNumber).toBe('CFM-2');
    expect(result.current.highlightItem).toBe('CFM-2');
    expect(result.current.hoverBoxRef.current.style.left).toBe('22px');
  });

  it('forwards a click on a segment to itemFocus.onSelect', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() => useRccpChartHoverSegment({
      chart, itemFocus: { onSelect },
    }));
    act(() => {
      result.current.hoverValue.onClick('CFM-3');
    });
    expect(onSelect).toHaveBeenCalledWith('CFM-3');
  });
});
