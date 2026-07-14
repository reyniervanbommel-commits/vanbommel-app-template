import { describe, expect, it } from 'vitest';
import {
  formatHistoryDate,
  formatHistoryStatus,
  formatHistoryValue,
  historyStatusColor,
} from './cellHistoryFormat';

describe('cellHistoryFormat', () => {
  it('preserves cell-history date formatting and empty fallback', () => {
    expect(formatHistoryDate('2026-07-13T10:15:00.000Z')).toBe('13/07/2026');
    expect(formatHistoryDate(null)).toBe('—');
  });

  it('formats ISO dates, booleans and plain values', () => {
    expect(formatHistoryValue('2026-04-17T00:00:00.000Z', 'text')).toBe('17/04/2026');
    expect(formatHistoryValue(true, 'boolean')).toBe('Yes');
    expect(formatHistoryValue('0', 'boolean')).toBe('No');
    expect(formatHistoryValue('Open', 'text')).toBe('Open');
    expect(formatHistoryValue('', 'text')).toBe('—');
  });

  it('maps known statuses and safely falls back for unknown statuses', () => {
    expect(formatHistoryStatus('applied')).toBe('Applied');
    expect(historyStatusColor('failed')).toBe('danger');
    expect(formatHistoryStatus('queued')).toBe('queued');
    expect(historyStatusColor('queued')).toBe('informative');
    expect(formatHistoryStatus(null)).toBeNull();
  });
});
