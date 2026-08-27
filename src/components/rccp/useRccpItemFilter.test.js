import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRccpItemFilter } from './useRccpItemFilter';

const chart = [{
  segmentsAbove: [{ itemNumber: 'CBM-1', qty: 2, status: 'open' }],
  segmentsBelow: [{ itemNumber: 'CFM-2', qty: 1, status: 'received' }],
}];

describe('useRccpItemFilter', () => {
  it('lists unique items and leaves the chart unfiltered by default', () => {
    const { result } = renderHook(() => useRccpItemFilter(chart));
    expect(result.current.items).toEqual(['CBM-1', 'CFM-2']);
    expect(result.current.filteredChart).toBe(chart);
  });

  it('filters stacks to the selected item', () => {
    const { result } = renderHook(() => useRccpItemFilter(chart));
    act(() => result.current.handleItemChange('CBM-1'));
    expect(result.current.itemNumber).toBe('CBM-1');
    expect(result.current.filteredChart[0].segmentsAbove).toEqual([
      { itemNumber: 'CBM-1', qty: 2, status: 'open' },
    ]);
    expect(result.current.filteredChart[0].segmentsBelow).toEqual([]);
  });

  it('clears the selection when the item disappears from the chart', () => {
    let nextChart = chart;
    const { result, rerender } = renderHook(() => useRccpItemFilter(nextChart));
    act(() => result.current.handleItemChange('CBM-1'));
    nextChart = [{ segmentsAbove: [{ itemNumber: 'CFM-2', qty: 1 }], segmentsBelow: [] }];
    rerender();
    expect(result.current.itemNumber).toBe('');
  });
});
