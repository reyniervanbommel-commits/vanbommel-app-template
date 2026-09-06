import { describe, expect, it } from 'vitest';
import {
  isRccpLoadDateRow,
  rccpMatrixCellAriaValue,
  rccpMatrixCellFontSize,
  rccpMatrixCellLength,
  rccpMatrixCellParts,
} from './rccpMatrixLoadDateCells';

describe('isRccpLoadDateRow', () => {
  it('marks quantity and remaining, not capacity rows', () => {
    expect(isRccpLoadDateRow({ isOrdered: true })).toBe(true);
    expect(isRccpLoadDateRow({ isOpen: true })).toBe(true);
    expect(isRccpLoadDateRow({ isCapacity: true })).toBe(false);
    expect(isRccpLoadDateRow({ isDelivered: true })).toBe(false);
    expect(isRccpLoadDateRow(null)).toBe(false);
  });
});

describe('rccpMatrixCellParts', () => {
  it('marks a single active mode with its superscript', () => {
    expect(rccpMatrixCellParts({ requested: 120, confirmed: 80 }, 'requested'))
      .toEqual([{ mode: 'requested', text: '120', marker: 'R' }]);
    expect(rccpMatrixCellParts({ requested: 120, confirmed: 80 }, 'confirmed'))
      .toEqual([{ mode: 'confirmed', text: '80', marker: 'C' }]);
  });

  it('returns both parts, requested first, when both modes are active', () => {
    expect(rccpMatrixCellParts(
      { requested: 120, confirmed: 80 },
      { requested: true, confirmed: true },
    )).toEqual([
      { mode: 'requested', text: '120', marker: 'R' },
      { mode: 'confirmed', text: '80', marker: 'C' },
    ]);
  });

  it('keeps only the mode that has a value in this period', () => {
    expect(rccpMatrixCellParts(
      { requested: 0, confirmed: 80 },
      { requested: true, confirmed: true },
    )).toEqual([{ mode: 'confirmed', text: '80', marker: 'C' }]);
    expect(rccpMatrixCellParts(
      { requested: 120 },
      { requested: true, confirmed: true },
    )).toEqual([{ mode: 'requested', text: '120', marker: 'R' }]);
  });

  it('returns no parts for an empty cell', () => {
    expect(rccpMatrixCellParts({}, { requested: true, confirmed: true })).toEqual([]);
  });
});

describe('rccpMatrixCellAriaValue', () => {
  it('spells the modes out for screen readers', () => {
    const parts = rccpMatrixCellParts(
      { requested: 120, confirmed: 80 },
      { requested: true, confirmed: true },
    );
    expect(rccpMatrixCellAriaValue(parts)).toBe('120 requested / 80 confirmed');
    expect(rccpMatrixCellAriaValue([])).toBe('0');
  });
});

describe('rccpMatrixCellFontSize', () => {
  it('keeps the full size while the value fits in the week column', () => {
    expect(rccpMatrixCellFontSize(0)).toBe(12);
    expect(rccpMatrixCellFontSize(3)).toBe(12);
    expect(rccpMatrixCellFontSize(6)).toBe(12);
  });

  it('shrinks longer values instead of letting them overflow', () => {
    const long = rccpMatrixCellFontSize(9);
    const longer = rccpMatrixCellFontSize(13);
    expect(long).toBeLessThan(12);
    expect(longer).toBeLessThan(long);
    expect(longer).toBeGreaterThanOrEqual(7);
    expect(rccpMatrixCellFontSize(40)).toBe(7);
  });

  it('counts both load dates plus their markers and separator', () => {
    const single = rccpMatrixCellParts({ requested: 120 }, 'requested');
    const both = rccpMatrixCellParts(
      { requested: 12345, confirmed: 6789 },
      { requested: true, confirmed: true },
    );
    expect(rccpMatrixCellLength(single)).toBeCloseTo(3.7, 5);
    // '12345' -> '12,345' (6 chars) en '6789' -> '6,789' (5 chars) door de duizendtal-separator.
    expect(rccpMatrixCellLength(both)).toBeCloseTo(13.4, 5);
    expect(rccpMatrixCellFontSize(rccpMatrixCellLength(both)))
      .toBeLessThan(rccpMatrixCellFontSize(rccpMatrixCellLength(single)));
  });
});
