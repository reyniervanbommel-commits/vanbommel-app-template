import { describe, expect, it } from 'vitest';
import {
  applyCollapsedColumnWidths,
  COLLAPSED_COLUMN_WIDTH,
  isColumnCollapsed,
  normalizeCollapsedColumnKeys,
  toggleCollapsedColumnKey,
} from './collapsedColumnUtils';

const DEFAULT_KEYS = ['a', 'b', 'c'];

describe('normalizeCollapsedColumnKeys', () => {
  it('returns empty for invalid input', () => {
    expect(normalizeCollapsedColumnKeys(null, DEFAULT_KEYS)).toEqual([]);
    expect(normalizeCollapsedColumnKeys([], DEFAULT_KEYS)).toEqual([]);
  });

  it('filters unknown keys and dedupes', () => {
    expect(normalizeCollapsedColumnKeys(['b', 'unknown', 'b', 'a'], DEFAULT_KEYS)).toEqual(['b', 'a']);
  });
});

describe('isColumnCollapsed', () => {
  it('detects collapsed keys', () => {
    expect(isColumnCollapsed('a', ['a'])).toBe(true);
    expect(isColumnCollapsed('b', ['a'])).toBe(false);
  });
});

describe('applyCollapsedColumnWidths', () => {
  it('overrides collapsed keys with the collapsed width', () => {
    expect(applyCollapsedColumnWidths({ a: 120, b: 200 }, ['b'])).toEqual({
      a: 120,
      b: COLLAPSED_COLUMN_WIDTH,
    });
  });
});

describe('toggleCollapsedColumnKey', () => {
  it('adds and removes keys', () => {
    expect(toggleCollapsedColumnKey(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleCollapsedColumnKey(['a', 'b'], 'a')).toEqual(['b']);
  });
});
