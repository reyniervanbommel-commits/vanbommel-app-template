import { describe, expect, it } from 'vitest';
import {
  formatIdleCountdown,
  getIdleSchedule,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_LEAD_MS,
} from './idleSession';

describe('idleSession helpers', () => {
  it('zet de idle-timeout op 45 minuten met 2 minuten waarschuwing', () => {
    expect(IDLE_TIMEOUT_MS).toBe(45 * 60 * 1000);
    expect(IDLE_WARNING_LEAD_MS).toBe(2 * 60 * 1000);
    expect(getIdleSchedule(IDLE_TIMEOUT_MS, IDLE_WARNING_LEAD_MS)).toEqual({
      warningAt: 43 * 60 * 1000,
      idleAt: 45 * 60 * 1000,
    });
  });

  it('houdt warningAt op 0 als de lead langer is dan idle', () => {
    expect(getIdleSchedule(1000, 5000)).toEqual({ warningAt: 0, idleAt: 1000 });
  });

  it('formatteert de countdown in het Engels', () => {
    expect(formatIdleCountdown(null)).toBe('soon');
    expect(formatIdleCountdown(1)).toBe('1 second');
    expect(formatIdleCountdown(12)).toBe('12 seconds');
  });
});
