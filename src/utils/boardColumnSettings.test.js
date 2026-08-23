import { describe, expect, it } from 'vitest';
import {
  arraysEqual,
  mergeColumnTextStyle,
  moveColumnKey,
  normalizeColumnOrder,
  normalizeColumnTextStyle,
  normalizeColumnTextStyleMap,
  normalizeColumnWidths,
  normalizeLineTotalLinks,
  normalizeSelectedColumns,
  normalizeVisibleColumns,
} from './boardColumnSettings';

const DEFAULT_KEYS = ['a', 'b', 'c', 'd'];

describe('normalizeVisibleColumns', () => {
  it('falls back to defaults for empty or invalid input', () => {
    expect(normalizeVisibleColumns(null, DEFAULT_KEYS)).toEqual(DEFAULT_KEYS);
    expect(normalizeVisibleColumns([], DEFAULT_KEYS)).toEqual(DEFAULT_KEYS);
    expect(normalizeVisibleColumns(['unknown'], DEFAULT_KEYS)).toEqual(DEFAULT_KEYS);
  });

  it('filters unknown keys and dedupes', () => {
    expect(normalizeVisibleColumns(['b', 'unknown', 'b', 'a'], DEFAULT_KEYS)).toEqual(['b', 'a']);
  });
});

describe('normalizeColumnOrder', () => {
  it('appends missing keys behind the stored order', () => {
    expect(normalizeColumnOrder(['c', 'a'], DEFAULT_KEYS)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('drops unknown keys', () => {
    expect(normalizeColumnOrder(['x', 'b'], DEFAULT_KEYS)).toEqual(['b', 'a', 'c', 'd']);
  });
});

describe('arraysEqual', () => {
  it('compares arrays element-wise', () => {
    expect(arraysEqual(['a'], ['a'])).toBe(true);
    expect(arraysEqual(['a'], ['b'])).toBe(false);
    expect(arraysEqual(['a'], ['a', 'b'])).toBe(false);
    expect(arraysEqual('a', 'a')).toBe(true);
    expect(arraysEqual('a', ['a'])).toBe(false);
  });
});

describe('normalizeColumnWidths', () => {
  it('clamps widths to the allowed range and rounds', () => {
    expect(normalizeColumnWidths({ a: 12, b: 5000, c: 150.6 }, DEFAULT_KEYS)).toEqual({
      a: 80,
      b: 1000,
      c: 151,
    });
  });

  it('ignores unknown keys and non-numeric values', () => {
    expect(normalizeColumnWidths({ x: 100, a: 'wide', b: 200 }, DEFAULT_KEYS)).toEqual({ b: 200 });
    expect(normalizeColumnWidths(['not-an-object'], DEFAULT_KEYS)).toEqual({});
  });
});

describe('normalizeColumnTextStyle', () => {
  it('validates hex colors and lowercases them', () => {
    expect(normalizeColumnTextStyle({ textColor: '#AABB11' })).toEqual({ textColor: '#aabb11' });
    expect(normalizeColumnTextStyle({ textColor: '#AABB11B3' })).toEqual({ textColor: '#aabb11b3' });
    expect(normalizeColumnTextStyle({ textColor: 'red' })).toBe(null);
  });

  it('returns null when no style attributes remain', () => {
    expect(normalizeColumnTextStyle({ bold: false })).toBe(null);
    expect(normalizeColumnTextStyle(null)).toBe(null);
  });
});

describe('normalizeColumnTextStyleMap', () => {
  it('keeps only valid styles for allowed keys', () => {
    expect(normalizeColumnTextStyleMap({
      a: { bold: true, italic: 'yes' },
      b: { textColor: 'nope' },
      x: { bold: true },
    }, DEFAULT_KEYS)).toEqual({ a: { bold: true } });
  });
});

describe('mergeColumnTextStyle', () => {
  it('applies the patch on top of the current style', () => {
    expect(mergeColumnTextStyle({ bold: true, textColor: '#aabb11' }, { italic: true })).toEqual({
      textColor: '#aabb11',
      bold: true,
      italic: true,
    });
  });

  it('can clear individual attributes and returns null when empty', () => {
    expect(mergeColumnTextStyle({ bold: true }, { bold: false })).toBe(null);
    expect(mergeColumnTextStyle({ textColor: '#aabb11' }, { textColor: '' })).toBe(null);
    expect(mergeColumnTextStyle(undefined, { underline: true })).toEqual({ underline: true });
  });
});

describe('normalizeSelectedColumns', () => {
  it('trims, dedupes and filters against allowed keys', () => {
    expect(normalizeSelectedColumns([' a ', 'a', '', 'x', 'b'], DEFAULT_KEYS)).toEqual(['a', 'b']);
    expect(normalizeSelectedColumns(null, DEFAULT_KEYS)).toEqual([]);
  });
});

describe('normalizeLineTotalLinks', () => {
  it('dedupes on line/header signature and validates both keys', () => {
    const links = [
      { lineColumnKey: 'qty', headerColumnKey: 'total' },
      { lineColumnKey: 'qty', headerColumnKey: 'total' },
      { lineColumnKey: '', headerColumnKey: 'total' },
      { lineColumnKey: 'unknown', headerColumnKey: 'total' },
    ];
    expect(normalizeLineTotalLinks(links, ['qty'], ['total'])).toEqual([
      { lineColumnKey: 'qty', headerColumnKey: 'total' },
    ]);
  });

  it('skips header validation when no header keys given', () => {
    expect(normalizeLineTotalLinks([{ lineColumnKey: 'qty', headerColumnKey: 'anything' }], ['qty'])).toEqual([
      { lineColumnKey: 'qty', headerColumnKey: 'anything' },
    ]);
  });
});

describe('moveColumnKey', () => {
  it('moves a key before or after the target', () => {
    expect(moveColumnKey(DEFAULT_KEYS, DEFAULT_KEYS, 'd', 'a', 'before')).toEqual(['d', 'a', 'b', 'c']);
    expect(moveColumnKey(DEFAULT_KEYS, DEFAULT_KEYS, 'a', 'c', 'after')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('returns the normalized order when source or target is unknown', () => {
    expect(moveColumnKey(DEFAULT_KEYS, DEFAULT_KEYS, 'x', 'a')).toEqual(DEFAULT_KEYS);
    expect(moveColumnKey(DEFAULT_KEYS, DEFAULT_KEYS, 'a', 'a')).toEqual(DEFAULT_KEYS);
  });

  it('keeps hidden (non-movable) columns on their relative position', () => {
    // 'b' is hidden: moving 'a' after 'c' may only reorder the visible subset.
    expect(moveColumnKey(DEFAULT_KEYS, DEFAULT_KEYS, 'a', 'c', 'after', ['a', 'c', 'd'])).toEqual(['c', 'b', 'a', 'd']);
  });
});
