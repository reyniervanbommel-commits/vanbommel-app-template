import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRccpKpiFilter } from './useRccpKpiFilter';

const chart = [{
  key: '2026-W10',
  segmentsAbove: [{ itemNumber: 'A', qty: 4, status: 'open', late: false }],
  segmentsBelow: [],
}];
const measureRows = [{ measureKey: 'open', isOpen: true }];

describe('useRccpKpiFilter', () => {
  it('toggles the selected KPI and filters the chart', () => {
    const { result } = renderHook(() => useRccpKpiFilter(chart, measureRows));
    expect(result.current.selectedKey).toBeNull();
    act(() => result.current.onSelect('open'));
    expect(result.current.selectedKey).toBe('open');
    expect(result.current.filteredChart[0].segmentsAbove).toHaveLength(1);
    expect(result.current.highlight.weeks).toEqual(['2026-W10']);
    act(() => result.current.onSelect('open'));
    expect(result.current.selectedKey).toBeNull();
  });
});
