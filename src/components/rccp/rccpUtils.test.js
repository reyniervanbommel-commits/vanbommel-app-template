import { describe, expect, it } from 'vitest';
import {
  buildMatrixPeriodHeaders,
  buildRccpChartWeekBoundaryCoordinates,
  formatIsoWeekMondayLabel,
  formatMatrixWeekLabel,
  isMatrixCellEmpty,
  resolveChartWeekRangeBounds,
  RCCP_CAPACITY_MEASURE_KEY,
  selectVisibleMeasureRows,
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

describe('selectVisibleMeasureRows', () => {
  const periodHeaders = [
    { year: 2021, week: 1 },
    { year: 2021, week: 2 },
  ];
  const emptyCell = { statusLabel: 'N/A', availableQty: 0, confirmedQty: 0 };

  it('keeps a user-added measure even when it has no data in the window', () => {
    const measureRows = [{ measureKey: 'remainingPurchaseQuantity', label: 'Remaining qty' }];
    // Geen enkele cel voor deze measure in cellMap -> alle cellen leeg.
    const rows = selectVisibleMeasureRows(measureRows, periodHeaders, new Map());
    expect(rows.map((r) => r.measureKey)).toEqual(['remainingPurchaseQuantity']);
  });

  it('hides the automatic capacity row when the window has no capacity', () => {
    const measureRows = [{ measureKey: RCCP_CAPACITY_MEASURE_KEY, label: 'Available capacity' }];
    const cellMap = new Map([
      [`${RCCP_CAPACITY_MEASURE_KEY}|2021|1`, emptyCell],
      [`${RCCP_CAPACITY_MEASURE_KEY}|2021|2`, emptyCell],
    ]);
    expect(selectVisibleMeasureRows(measureRows, periodHeaders, cellMap)).toEqual([]);
  });

  it('keeps the capacity row when at least one week has capacity', () => {
    const measureRows = [{ measureKey: RCCP_CAPACITY_MEASURE_KEY, label: 'Available capacity' }];
    const cellMap = new Map([
      [`${RCCP_CAPACITY_MEASURE_KEY}|2021|1`, emptyCell],
      [`${RCCP_CAPACITY_MEASURE_KEY}|2021|2`, { statusLabel: 'N/A', availableQty: 100, confirmedQty: 0 }],
    ]);
    expect(selectVisibleMeasureRows(measureRows, periodHeaders, cellMap)).toHaveLength(1);
  });
});
