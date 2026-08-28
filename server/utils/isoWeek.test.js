'use strict';

const {
  getIsoWeek,
  getIsoWeekYear,
  isoWeekKey,
  parseIsoWeekKey,
  isoWeekStartUtc,
  isoWeekEndUtc,
  isIsoWeekInWindow,
  weeksInIsoYear,
  buildWeekRange,
} = require('../utils/isoWeek');

describe('isoWeek', () => {
  it('resolves week 1 for the first Thursday of the year', () => {
    expect(getIsoWeekYear('2024-01-04')).toBe(2024);
    expect(getIsoWeek('2024-01-04')).toBe(1);
  });

  it('handles week 53 when applicable', () => {
    expect(weeksInIsoYear(2020)).toBe(53);
    expect(getIsoWeek('2020-12-31')).toBe(53);
    expect(getIsoWeekYear('2020-12-31')).toBe(2020);
  });

  it('handles year transition at ISO week boundaries', () => {
    expect(getIsoWeekYear('2025-01-01')).toBe(2025);
    expect(getIsoWeek('2025-01-01')).toBe(1);
    expect(getIsoWeekYear('2024-12-30')).toBe(2025);
    expect(getIsoWeek('2024-12-30')).toBe(1);
  });

  it('builds week ranges across year boundaries', () => {
    const range = buildWeekRange(2020, 52, 2021, 2);
    expect(range[0]).toEqual({ year: 2020, week: 52, key: '2020-W52' });
    expect(range[range.length - 1]).toEqual({ year: 2021, week: 2, key: '2021-W02' });
  });

  it('keeps a multi-year RCCP window instead of stopping after 120 weeks', () => {
    const range = buildWeekRange(2023, 22, 2026, 47);
    expect(range[0]).toEqual({ year: 2023, week: 22, key: '2023-W22' });
    expect(range[range.length - 1]).toEqual({ year: 2026, week: 47, key: '2026-W47' });
    expect(range.length).toBeGreaterThan(120);
  });

  it('parses iso week keys', () => {
    expect(parseIsoWeekKey('2024-W09')).toEqual({ year: 2024, week: 9 });
    expect(parseIsoWeekKey('bad')).toBeNull();
  });

  it('formats iso week keys with padding', () => {
    expect(isoWeekKey(2024, 3)).toBe('2024-W03');
  });

  it('checks whether an ISO week sits inside a window', () => {
    const window = { fromYear: 2026, fromWeek: 10, toYear: 2026, toWeek: 12 };
    expect(isIsoWeekInWindow(2026, 10, window)).toBe(true);
    expect(isIsoWeekInWindow(2026, 12, window)).toBe(true);
    expect(isIsoWeekInWindow(2026, 9, window)).toBe(false);
    expect(isIsoWeekInWindow(2026, 13, window)).toBe(false);
  });

  it('returns UTC week boundaries', () => {
    const start = isoWeekStartUtc(2024, 10);
    const end = isoWeekEndUtc(2024, 10);
    expect(start.getUTCDay()).toBe(1);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});
