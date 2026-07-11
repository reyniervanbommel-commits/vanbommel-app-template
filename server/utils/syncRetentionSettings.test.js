import { describe, expect, it } from 'vitest';
import { resolveRetentionWarning } from './syncRetentionSettings';

describe('syncRetentionSettings', () => {
  const settings = { warnAt: 200, criticalAt: 500 };

  it('returns none below warn threshold', () => {
    expect(resolveRetentionWarning(0, settings)).toBe('none');
    expect(resolveRetentionWarning(199, settings)).toBe('none');
  });

  it('returns approaching at warn threshold', () => {
    expect(resolveRetentionWarning(200, settings)).toBe('approaching');
  });

  it('returns critical at critical threshold', () => {
    expect(resolveRetentionWarning(500, settings)).toBe('critical');
  });

  it('returns cap when cap reached flag is set', () => {
    expect(resolveRetentionWarning(10, settings, { capReached: true })).toBe('cap');
  });
});
