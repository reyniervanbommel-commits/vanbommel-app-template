import { describe, expect, it } from 'vitest';
import {
  resolveRetentionWarning,
  DEFAULTS,
  RETAINED_MAX_LIMIT,
  deriveRetentionCompanionSettings,
  expandRetentionSettings,
} from './syncRetentionSettings';

describe('syncRetentionSettings defaults', () => {
  it('keeps 2,000 orders outside the sync filter', () => {
    expect(DEFAULTS.PO_SYNC_RETAINED_MAX_AUTO).toBe(2000);
    expect(DEFAULTS.PO_SYNC_RETAINED_FETCH_BUDGET).toBe(2000);
  });
});

describe('deriveRetentionCompanionSettings', () => {
  it('keeps fetch budget equal to the cap and scales warnings', () => {
    expect(deriveRetentionCompanionSettings(2000)).toEqual({
      maxAuto: 2000,
      fetchBudget: 2000,
      warnAt: 800,
      criticalAt: 1800,
    });
  });

  it('clamps above the hard limit', () => {
    expect(deriveRetentionCompanionSettings(50000).maxAuto).toBe(RETAINED_MAX_LIMIT);
  });

  it('falls back to the default for invalid input', () => {
    expect(deriveRetentionCompanionSettings('')).toEqual(deriveRetentionCompanionSettings(2000));
    expect(deriveRetentionCompanionSettings(0).maxAuto).toBe(2000);
  });
});

describe('expandRetentionSettings', () => {
  it('fills companion keys when the retention cap is saved', () => {
    const expanded = expandRetentionSettings({
      PO_SYNC_MAX_ORDERS: '1500',
      PO_SYNC_RETAINED_MAX_AUTO: '1000',
    });
    expect(expanded).toEqual({
      PO_SYNC_MAX_ORDERS: '1500',
      PO_SYNC_RETAINED_MAX_AUTO: '1000',
      PO_SYNC_RETAINED_FETCH_BUDGET: '1000',
      PO_SYNC_RETAINED_WARN_AT: '400',
      PO_SYNC_RETAINED_CRITICAL_AT: '900',
    });
  });

  it('leaves other settings untouched when the retention cap is absent', () => {
    const input = { PO_SYNC_MAX_ORDERS: '1500' };
    expect(expandRetentionSettings(input)).toBe(input);
  });
});

describe('syncRetentionSettings', () => {
  const settings = { warnAt: 800, criticalAt: 1800 };

  it('returns none below warn threshold', () => {
    expect(resolveRetentionWarning(0, settings)).toBe('none');
    expect(resolveRetentionWarning(799, settings)).toBe('none');
  });

  it('returns approaching at warn threshold', () => {
    expect(resolveRetentionWarning(800, settings)).toBe('approaching');
  });

  it('returns critical at critical threshold', () => {
    expect(resolveRetentionWarning(1800, settings)).toBe('critical');
  });

  it('returns cap when cap reached flag is set', () => {
    expect(resolveRetentionWarning(10, settings, { capReached: true })).toBe('cap');
  });
});
