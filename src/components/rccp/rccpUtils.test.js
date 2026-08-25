import { describe, expect, it } from 'vitest';
import {
  applyRccpChartSettings,
  buildMatrixPeriodHeaders,
  buildRccpChartWeekBoundaryCoordinates,
  formatIsoWeekMondayLabel,
  formatMatrixWeekLabel,
  isMatrixCellEmpty,
  resolveChartWeekRangeBounds,
  resolveRccpDashboardKpis,
} from './rccpUtils';

describe('matrix period headers', () => {
  it('shows week numbers only within a single year', () => {
    const headers = buildMatrixPeriodHeaders([
      { year: 2026, week: 1, key: '2026-W01' },
      { year: 2026, week: 2, key: '2026-W02' },
    ]);
    expect(headers[0].weekLabel).toBe('01');
    expect(headers[0].mondayLabel).toBe(formatIsoWeekMondayLabel(2026, 1));
    expect(headers[0].yearLabel).toBe('');
    expect(headers[1].yearLabel).toBe('');
  });

  it('shows year label when the range crosses years', () => {
    const headers = buildMatrixPeriodHeaders([
      { year: 2026, week: 52, key: '2026-W52' },
      { year: 2027, week: 1, key: '2027-W01' },
    ]);
    expect(formatMatrixWeekLabel(52)).toBe('52');
    expect(headers[0].yearLabel).toBe('2026');
    expect(headers[1].yearLabel).toBe('2027');
  });
});

describe('resolveChartWeekRangeBounds', () => {
  const periods = [
    { year: 2026, week: 12, key: '2026-W12' },
    { year: 2026, week: 13, key: '2026-W13' },
    { year: 2026, week: 14, key: '2026-W14' },
    { year: 2026, week: 15, key: '2026-W15' },
  ];

  it('maps a configured range onto visible period keys', () => {
    const bounds = resolveChartWeekRangeBounds({
      fromYear: 2026,
      fromWeek: 13,
      toYear: 2026,
      toWeek: 14,
      color: '#00c875',
    }, periods);
    expect(bounds).toEqual({
      x1: '2026-W13',
      x2: '2026-W14',
      color: '#00c875',
      label: undefined,
    });
  });

  it('returns null when the range is outside the visible window', () => {
    expect(resolveChartWeekRangeBounds({
      fromYear: 2026,
      fromWeek: 1,
      toYear: 2026,
      toWeek: 2,
      color: '#579bfc',
    }, periods)).toBeNull();
  });
});

describe('buildRccpChartWeekBoundaryCoordinates', () => {
  it('includes the Y-axis offset so lines align with week band edges', () => {
    const coordinates = buildRccpChartWeekBoundaryCoordinates(3)({ offset: { left: 42 } });
    expect(coordinates).toEqual([42, 110, 178, 246]);
  });
});

describe('isMatrixCellEmpty', () => {
  it('treats N/A zero cells as empty', () => {
    expect(isMatrixCellEmpty({
      statusLabel: 'N/A',
      availableQty: 0,
      confirmedQty: 0,
    })).toBe(true);
  });

  it('keeps cells with load or capacity', () => {
    expect(isMatrixCellEmpty({
      statusLabel: 'Unplanned',
      availableQty: 0,
      confirmedQty: 5,
    })).toBe(false);
  });
});

describe('applyRccpChartSettings', () => {
  it('updates chart type, colour and visibility on matching measures', () => {
    const analysis = {
      config: { showCapacityLine: true },
      measureRows: [
        { measureKey: 'quantity', label: 'Quantity', chartType: 'line', color: '#D13438', showInChart: true },
        { measureKey: '__capacity__', label: 'Available capacity', chartType: 'line', isCapacity: true, showInChart: true },
        { measureKey: '__warning__', label: 'Warning threshold', chartType: 'line', isWarning: true, showInChart: true },
      ],
    };
    const next = applyRccpChartSettings(analysis, {
      quantityMeasures: [
        { columnKey: 'quantity', label: 'Qty', chartType: 'bar', color: '#0078D4', showInChart: false },
      ],
      showCapacityLine: false,
      showWarningLine: false,
      chartWeekRanges: [{ fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 4, color: '#00c875' }],
    });
    expect(next.measureRows[0]).toMatchObject({
      label: 'Qty', chartType: 'bar', color: '#0078D4', showInChart: false,
    });
    expect(next.measureRows[1].showInChart).toBe(false);
    expect(next.measureRows[2].showInChart).toBe(false);
    expect(next.config.chartWeekRanges).toHaveLength(1);
  });

  it('returns the original analysis when config is missing', () => {
    const analysis = { measureRows: [] };
    expect(applyRccpChartSettings(analysis, null)).toBe(analysis);
    expect(applyRccpChartSettings(null, {})).toBeNull();
  });
});

describe('resolveRccpDashboardKpis', () => {
  const windowed = { totalOrdered: 10 };
  const all = { totalOrdered: 99 };

  it('uses windowed KPIs when the selected-weeks toggle is on', () => {
    expect(resolveRccpDashboardKpis({ kpis: windowed, kpisAll: all }, true)).toBe(windowed);
  });

  it('uses all-data KPIs when the toggle is off', () => {
    expect(resolveRccpDashboardKpis({ kpis: windowed, kpisAll: all }, false)).toBe(all);
  });

  it('falls back to windowed KPIs when all-data is missing', () => {
    expect(resolveRccpDashboardKpis({ kpis: windowed }, false)).toBe(windowed);
  });
});
