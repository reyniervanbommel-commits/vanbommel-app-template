import { describe, expect, it } from 'vitest';
import { arcSlicePath, kpiPiePercent, pieBisectorAngle, pieSliceOffset, pieSlicePath } from './kpiPctPieUtils';

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

describe('arcSlicePath', () => {
  it('returns an empty path when the range is empty', () => {
    expect(arcSlicePath(40, 40)).toBe('');
    expect(arcSlicePath(60, 40)).toBe('');
  });

  it('draws the complementary slice for the remaining share', () => {
    expect(arcSlicePath(25, 100)).toContain('M 50 50');
  });

  it('draws a full circle when the range spans 100%', () => {
    expect(arcSlicePath(0, 100)).toContain('A 50 50');
  });
});

describe('pieBisectorAngle', () => {
  it('returns the midpoint angle in degrees', () => {
    expect(pieBisectorAngle(0, 50)).toBe(90);
    expect(pieBisectorAngle(50, 100)).toBe(270);
  });
});

describe('pieSliceOffset', () => {
  it('pushes straight up at 0 degrees', () => {
    const { x, y } = pieSliceOffset(0, 5);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-5);
  });

  it('pushes straight right at 90 degrees', () => {
    const { x, y } = pieSliceOffset(90, 5);
    expect(x).toBeCloseTo(5);
    expect(y).toBeCloseTo(0);
  });
});
