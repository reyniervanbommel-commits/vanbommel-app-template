import { describe, expect, it } from 'vitest';
import { formatRefreshDuration, refreshDurationLabel } from './d365RefreshDuration';

describe('d365RefreshDuration', () => {
  it('formatteert minuten en seconden als 12m 04s', () => {
    expect(formatRefreshDuration(
      '2026-08-23T00:00:00.000Z',
      '2026-08-23T00:12:04.000Z',
    )).toBe('12m 04s');
  });

  it('toont in progress zonder finished_at', () => {
    expect(refreshDurationLabel('2026-08-23T00:00:00.000Z', null, 'running')).toBe('in progress');
  });
});
