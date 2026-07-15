import { describe, expect, it } from 'vitest';
import {
  DATE_PERIOD_DISPLAY_MODES,
  formatDatePeriodValue,
  isDatePeriodColumn,
  normalizeDatePeriodDisplayMode,
  parseDateValueForPeriod,
  resolveDatePeriodCellValue,
} from './datePeriodColumnUtils';

describe('datePeriodColumnUtils', () => {
  it('detects date period columns', () => {
    expect(isDatePeriodColumn({ dataType: 'date_period' })).toBe(true);
    expect(isDatePeriodColumn({ dataType: 'text' })).toBe(false);
  });

  it('formats ISO week numbers', () => {
    expect(formatDatePeriodValue('2026-07-15', DATE_PERIOD_DISPLAY_MODES.week)).toBe('29');
  });

  it('formats English month names', () => {
    expect(formatDatePeriodValue('2026-07-15', DATE_PERIOD_DISPLAY_MODES.month)).toBe('July');
  });

  it('parses ISO datetime values', () => {
    const parsed = parseDateValueForPeriod('2021-11-08T00:00:00.000Z');
    expect(parsed?.getFullYear()).toBe(2021);
    expect(parsed?.getMonth()).toBe(10);
    expect(parsed?.getDate()).toBe(8);
  });

  it('derives cell values from the configured source column', () => {
    const column = {
      dataType: 'date_period',
      key: 'deliveryWeek',
      options: { sourceColumnKey: 'requestedDeliveryDate' },
    };
    const values = { requestedDeliveryDate: '2026-07-15' };
    expect(resolveDatePeriodCellValue(column, values, 'week')).toBe('29');
    expect(resolveDatePeriodCellValue(column, values, 'month')).toBe('July');
  });

  it('normalizes display mode fallback to week', () => {
    expect(normalizeDatePeriodDisplayMode('month')).toBe('month');
    expect(normalizeDatePeriodDisplayMode('unknown')).toBe('week');
  });
});
