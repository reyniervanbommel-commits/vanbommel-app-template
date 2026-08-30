import { describe, expect, it } from 'vitest';
import { applyOpacity } from '../../utils/hexColor';
import { KPI_PIE_GRAY } from '../../utils/kpiCardStyles';
import { kpiPieColors, kpiPiePercent, pieSlicePath } from './kpiPctPieUtils';

describe('kpiPiePercent', () => {
  it('clamps a numeric percent into 0–100', () => {
    expect(kpiPiePercent(99.5)).toBe(99.5);
    expect(kpiPiePercent(0)).toBe(0);
    expect(kpiPiePercent(140)).toBe(100);
    expect(kpiPiePercent(-4)).toBe(0);
  });

  it('treats missing values as empty (no pie)', () => {
    expect(kpiPiePercent(null)).toBe(null);
    expect(kpiPiePercent(undefined)).toBe(null);
    expect(kpiPiePercent('')).toBe(null);
  });
});

describe('kpiPieColors', () => {
  it('uses 80% transparent gray fill and 50% transparent gray rest by default', () => {
    const { fill, rest } = kpiPieColors();
    expect(fill).toBe(applyOpacity(KPI_PIE_GRAY, 20));
    expect(rest).toBe(applyOpacity(KPI_PIE_GRAY, 50));
  });

  it('keeps the rest gray when a fill override is set', () => {
    const { fill, rest } = kpiPieColors('#e2445c');
    expect(fill).toBe('#e2445c');
    expect(rest).toBe(applyOpacity(KPI_PIE_GRAY, 50));
  });
});

describe('pieSlicePath', () => {
  it('returns an empty path at 0%', () => {
    expect(pieSlicePath(0)).toBe('');
  });

  it('draws a full circle at 100%', () => {
    expect(pieSlicePath(100)).toContain('A 50 50');
  });

  it('uses a large-arc flag above 50%', () => {
    expect(pieSlicePath(25)).toMatch(/A 50 50 0 0 1 /);
    expect(pieSlicePath(75)).toMatch(/A 50 50 0 1 1 /);
  });
});
