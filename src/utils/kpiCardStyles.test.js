import { describe, expect, it } from 'vitest';
import { applyOpacity } from './hexColor';
import {
  KPI_PIE_GRAY,
  KPI_STYLE_KEYS,
  KPI_THRESHOLD_GREEN,
  KPI_THRESHOLD_RED,
  defaultKpiCardStyle,
  normalizeKpiCardStyles,
  resolveKpiAccentColor,
  resolveKpiPieColors,
} from './kpiCardStyles';

describe('normalizeKpiCardStyles', () => {
  it('stores only a threshold per percentage KPI', () => {
    const styles = normalizeKpiCardStyles(null);
    KPI_STYLE_KEYS.forEach((key) => {
      expect(styles[key]).toEqual({ threshold: null });
      expect(defaultKpiCardStyle(key)).toEqual({ threshold: null });
    });
  });

  it('keeps a numeric threshold and ignores old color fields', () => {
    const styles = normalizeKpiCardStyles({
      delivered: { belowColor: '#e2445c', aboveColor: '#00c875', threshold: 95.5 },
    });
    expect(styles.delivered).toEqual({ threshold: 95.5 });
  });

  it('clamps out-of-range thresholds', () => {
    expect(normalizeKpiCardStyles({ delivered: { threshold: 140 } }).delivered.threshold).toBe(100);
    expect(normalizeKpiCardStyles({ delivered: { threshold: -3 } }).delivered.threshold).toBe(0);
  });
});

describe('resolveKpiAccentColor', () => {
  it('uses opaque red below the threshold and opaque green from the threshold', () => {
    expect(resolveKpiAccentColor(89.9, { threshold: 90 })).toBe(KPI_THRESHOLD_RED);
    expect(resolveKpiAccentColor(90, { threshold: 90 })).toBe(KPI_THRESHOLD_GREEN);
  });

  it('uses 80% transparent gray when no threshold is set', () => {
    expect(resolveKpiAccentColor(100, { threshold: null })).toBe(applyOpacity(KPI_PIE_GRAY, 20));
  });
});

describe('resolveKpiPieColors', () => {
  it('uses 50% transparent gray for the incomplete slice', () => {
    const { rest } = resolveKpiPieColors(40, { threshold: 90 });
    expect(rest).toBe(applyOpacity(KPI_PIE_GRAY, 50));
  });

  it('pairs the fill with the accent color', () => {
    expect(resolveKpiPieColors(40, { threshold: 90 }).fill).toBe(KPI_THRESHOLD_RED);
    expect(resolveKpiPieColors(90, { threshold: 90 }).fill).toBe(KPI_THRESHOLD_GREEN);
  });
});
