// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRccpChartSeriesData } from './useRccpChartSeriesData';
import { buildRccpChartWeekBoundaryCoordinates, buildMatrixPeriodHeaders } from '../components/rccp/rccpUtils';

const periods = [
  { key: '2026-W10', year: 2026, week: 10 },
  { key: '2026-W11', year: 2026, week: 11 },
];
const periodHeaders = buildMatrixPeriodHeaders(periods);

const orderedRows = [
  { measureKey: 'open', label: 'Open', isOpen: true, color: '#0078D4', showInChart: true },
  { measureKey: 'received', label: 'Received', isDelivered: true, color: '#107C10', showInChart: true },
];

const chart = periods.map((period) => ({
  ...period,
  segmentsAbove: [{ itemNumber: 'CFM-2', qty: 4, status: 'open' }],
  segmentsBelow: [{ itemNumber: 'CFM-2', qty: 2, status: 'received' }],
  open: 4,
}));

function baseInput(overrides = {}) {
  return {
    orderedRows,
    visibleKeys: { open: true, received: true },
    chart,
    chartHeight: 180,
    chartWidth: 300,
    weekBoundaryCoordinates: buildRccpChartWeekBoundaryCoordinates(periodHeaders.length),
    chartRangeBands: [],
    periodHeaders,
    ...overrides,
  };
}

describe('useRccpChartSeriesData', () => {
  it('builds a plot, stack and legend from the visible rows', () => {
    const { result } = renderHook(() => useRccpChartSeriesData(baseInput()));
    expect(result.current.plot.data).toHaveLength(periods.length);
    expect(result.current.plot.width).toBe(300);
    expect(result.current.stack.dual).toBe(false);
    expect(result.current.legendItems.some((item) => item.key === 'delivered')).toBe(true);
    expect(result.current.yAxis.plotHeight).toBeGreaterThan(0);
    expect(result.current.yAxis.domain).toBeInstanceOf(Array);
  });

  it('omits the load legend item once the open row is toggled off', () => {
    const { result } = renderHook(() => useRccpChartSeriesData(baseInput({
      visibleKeys: { open: false, received: true },
    })));
    expect(result.current.legendItems.some((item) => item.key === 'load-primary')).toBe(false);
    expect(result.current.legendItems.some((item) => item.key === 'delivered')).toBe(true);
  });

  it('reflects two load-date series in the seriesSignature and stack when dual planning is on', () => {
    const { result } = renderHook(() => useRccpChartSeriesData(baseInput({
      chartSecondary: chart,
      planningDateModes: { requested: true, confirmed: true },
    })));
    expect(result.current.stack.dual).toBe(true);
    expect(result.current.seriesSignature).toContain('true|true');
  });
});
