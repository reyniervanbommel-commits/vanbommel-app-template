import { describe, expect, it } from 'vitest';
import {
  applyRccpChartSettings,
  buildAnalysisQuery,
  buildMatrixPeriodHeaders,
  buildRccpChartWeekBoundaryCoordinates,
  clampIsoWeek,
  compareIsoWeekParts,
  formatIsoWeekMondayLabel,
  formatMatrixWeekLabel,
  isoWeekPartsFromLocalDate,
  isoWindowFromWeekClicks,
  isoWeeksInYear,
  currentIsoWeekParts,
  isMatrixCellEmpty,
  resolveChartWeekRangeBounds,
  resolveRccpDashboardKpis,
  shouldOfferRccpDataWindow,
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

  it('shows short month names and the rolled-up week span', () => {
    const headers = buildMatrixPeriodHeaders([
      { year: 2026, week: 10, lastWeek: 13, month: 3, key: '2026-M03' },
    ]);
    expect(headers[0].weekLabel).toBe('Mar');
    expect(headers[0].mondayLabel).toBe('W10–W13');
    expect(headers[0].yearLabel).toBe('');
  });

  it('shows a year on the first month of each year when the range crosses years', () => {
    const headers = buildMatrixPeriodHeaders([
      { year: 2022, week: 48, lastWeek: 52, month: 12, key: '2022-M12' },
      { year: 2023, week: 1, lastWeek: 5, month: 1, key: '2023-M01' },
    ]);
    expect(headers[0].yearLabel).toBe('2022');
    expect(headers[1].yearLabel).toBe('2023');
  });
});

describe('isoWeeksInYear', () => {
  it('returns 53 weeks for 2020 and 52 for 2025', () => {
    expect(isoWeeksInYear(2020)).toBe(53);
    expect(isoWeeksInYear(2025)).toBe(52);
  });

  it('clamps week 53 in a 52-week year', () => {
    expect(clampIsoWeek(2025, 53)).toBe(52);
    expect(clampIsoWeek(2020, 53)).toBe(53);
    expect(clampIsoWeek(2026, 0)).toBe(1);
  });
});

describe('isoWindowFromWeekClicks', () => {
  it('starts a single-week range then completes to the later week', () => {
    const first = isoWindowFromWeekClicks(null, { year: 2026, week: 10 });
    expect(first.window).toEqual({
      fromYear: 2026, fromWeek: 10, toYear: 2026, toWeek: 10,
    });
    const second = isoWindowFromWeekClicks(first.nextAnchor, { year: 2026, week: 12 });
    expect(second.window.toWeek).toBe(12);
    expect(second.nextAnchor).toBeNull();
  });

  it('swaps when the second click is earlier', () => {
    const result = isoWindowFromWeekClicks({ year: 2026, week: 12 }, { year: 2026, week: 8 });
    expect(result.window).toEqual({
      fromYear: 2026, fromWeek: 8, toYear: 2026, toWeek: 12,
    });
  });
});

describe('isoWeekPartsFromLocalDate', () => {
  it('maps a local calendar date onto the ISO week', () => {
    expect(isoWeekPartsFromLocalDate(new Date(2026, 0, 1))).toEqual({ year: 2026, week: 1 });
    expect(isoWeekPartsFromLocalDate(new Date(2025, 11, 29))).toEqual({ year: 2026, week: 1 });
    expect(isoWeekPartsFromLocalDate(new Date(2023, 4, 1))).toEqual({ year: 2023, week: 18 });
    expect(isoWeekPartsFromLocalDate(new Date(2023, 4, 29))).toEqual({ year: 2023, week: 22 });
    expect(compareIsoWeekParts({ year: 2026, week: 2 }, { year: 2026, week: 1 })).toBeGreaterThan(0);
  });
});

describe('currentIsoWeekParts', () => {
  it('uses the ISO week-year around 1 January', () => {
    expect(currentIsoWeekParts(new Date('2024-12-30T12:00:00.000Z'))).toEqual({ year: 2025, week: 1 });
    expect(currentIsoWeekParts(new Date('2026-01-01T12:00:00.000Z'))).toEqual({ year: 2026, week: 1 });
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

  it('maps a week range onto overlapping month columns', () => {
    const months = [
      { year: 2026, week: 10, lastWeek: 13, month: 3, key: '2026-M03' },
      { year: 2026, week: 14, lastWeek: 17, month: 4, key: '2026-M04' },
    ];
    const bounds = resolveChartWeekRangeBounds({
      fromYear: 2026,
      fromWeek: 13,
      toYear: 2026,
      toWeek: 14,
      color: '#00c875',
    }, months);
    expect(bounds).toEqual({
      x1: '2026-M03',
      x2: '2026-M04',
      color: '#00c875',
      label: undefined,
    });
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

describe('shouldOfferRccpDataWindow', () => {
  const dataWindow = { fromYear: 2022, fromWeek: 1, toYear: 2022, toWeek: 53 };

  it('offers a jump when selected weeks are empty but the vendor has load elsewhere', () => {
    expect(shouldOfferRccpDataWindow({
      kpis: { totalOrdered: 0 },
      kpisAll: { totalOrdered: 120976 },
      dataWindow,
    })).toBe(true);
  });

  it('does not offer a jump when the selected weeks already have load', () => {
    expect(shouldOfferRccpDataWindow({
      kpis: { totalOrdered: 10 },
      kpisAll: { totalOrdered: 99 },
      dataWindow,
    })).toBe(false);
  });

  it('does not offer a jump when the vendor has no load at all', () => {
    expect(shouldOfferRccpDataWindow({
      kpis: { totalOrdered: 0 },
      kpisAll: { totalOrdered: 0 },
      dataWindow,
    })).toBe(false);
  });
});

describe('buildAnalysisQuery', () => {
  const WINDOW = { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8 };

  it('does not put planningDate on the analysis query', () => {
    expect(buildAnalysisQuery(WINDOW, 'V1')).not.toContain('planningDate');
    expect(buildAnalysisQuery(WINDOW, 'V1')).toContain('vendorAccount=V1');
  });
});
