import { describe, expect, it } from 'vitest';
import {
  isDateDataType,
  normalizeDateValue,
  toDisplayDateValue,
  toInputValue,
} from './writeBackDateUtils';

describe('writeBackDateUtils', () => {
  it('normalizes ISO datetime to a date-only string', () => {
    expect(normalizeDateValue('2026-08-25T00:00:00.000Z')).toBe('2026-08-25');
  });

  it('formats a date-only value as dd/mm/yyyy', () => {
    expect(toDisplayDateValue('2026-08-25')).toBe('25/08/2026');
  });

  it('treats date and datetime as date data types', () => {
    expect(isDateDataType('date')).toBe(true);
    expect(isDateDataType('text')).toBe(false);
  });

  it('returns an empty string for missing input values', () => {
    expect(toInputValue(null, 'text')).toBe('');
  });
});
