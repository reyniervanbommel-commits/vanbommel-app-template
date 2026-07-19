import { describe, expect, it } from 'vitest';
import {
  buildMatrixPeriodHeaders,
  formatIsoWeekMondayLabel,
  formatMatrixWeekLabel,
  isMatrixCellEmpty,
  resolveChartWeekRangeBounds,
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
