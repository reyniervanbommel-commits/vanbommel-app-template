import { describe, expect, it } from 'vitest';
import {
  formatIsoDate,
  getIsoWeekNumber,
  parseIsoDate,
} from './weekNumberCalendarUtils';

describe('weekNumberCalendarUtils', () => {
  it('parses and formats ISO dates', () => {
    expect(formatIsoDate(parseIsoDate('2026-01-05'))).toBe('2026-01-05');
    expect(parseIsoDate('not-a-date')).toBeNull();
  });

  it('returns ISO week numbers', () => {
    // 29 Dec 2025 is Monday of ISO week 1 of 2026
    expect(getIsoWeekNumber(new Date(2025, 11, 29))).toBe(1);
    // 15 Jul 2026 is Wednesday of ISO week 29
    expect(getIsoWeekNumber(new Date(2026, 6, 15))).toBe(29);
    // 31 Dec 2020 is Thursday of ISO week 53
    expect(getIsoWeekNumber(new Date(2020, 11, 31))).toBe(53);
  });
});
