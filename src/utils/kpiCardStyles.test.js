import { describe, expect, it } from 'vitest';
import {
  KPI_COLOR_TARGET_OTHER,
  KPI_PIE_GRAY,
  KPI_PIE_GRAY_LIGHT,
  KPI_STYLE_KEYS,
  defaultKpiCardStyle,
  normalizeKpiCardStyles,
  resolveKpiPieColors,
} from './kpiCardStyles';

describe('normalizeKpiCardStyles', () => {
  it('stores no color by default', () => {
    const styles = normalizeKpiCardStyles(null);
    KPI_STYLE_KEYS.forEach((key) => {
      expect(styles[key]).toEqual({ color: null, colorTarget: 'value' });
      expect(defaultKpiCardStyle(key)).toEqual({ color: null, colorTarget: 'value' });
    });
  });

  it('keeps a valid hex color and colorTarget, ignores old threshold field', () => {
    const styles = normalizeKpiCardStyles({
      delivered: { threshold: 95.5, color: '#00C875', colorTarget: 'other' },
    });
    expect(styles.delivered).toEqual({ color: '#00c875', colorTarget: 'other' });
  });

  it('drops an invalid color', () => {
    expect(normalizeKpiCardStyles({ delivered: { color: 'not-a-color' } }).delivered.color).toBeNull();
  });
});

describe('resolveKpiPieColors', () => {
  it('uses solid grays for both slices when no color is picked', () => {
    const { fill, rest } = resolveKpiPieColors({ color: null, colorTarget: 'value' });
    expect(fill).toBe(KPI_PIE_GRAY_LIGHT);
    expect(rest).toBe(KPI_PIE_GRAY);
  });

  it('colors this value by default, other value stays a solid gray', () => {
    const { fill, rest } = resolveKpiPieColors({ color: '#00c875', colorTarget: 'value' });
    expect(fill).toBe('#00c875');
    expect(rest).toBe(KPI_PIE_GRAY);
  });

  it('colors the other value when colorTarget is other, this value stays a solid gray (never a tint)', () => {
    const { fill, rest } = resolveKpiPieColors({ color: '#00c875', colorTarget: KPI_COLOR_TARGET_OTHER });
    expect(fill).toBe(KPI_PIE_GRAY);
    expect(rest).toBe('#00c875');
  });
});
