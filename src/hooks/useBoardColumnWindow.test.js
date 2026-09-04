import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  computeBoardColumnWindow,
  resolveBoardRowColumnSlices,
  useBoardColumnWindow,
} from './useBoardColumnWindow';

function offsetsFor(widths) {
  const offsets = [0];
  widths.forEach((width) => {
    offsets.push(offsets[offsets.length - 1] + width);
  });
  return offsets;
}

const TEN_COLS = Array(10).fill(100);

describe('useBoardColumnWindow', () => {
  it('applies getScale to offsets so scrollLeft maps to visual columns', () => {
    const el = {
      scrollLeft: 170,
      clientWidth: 200,
      addEventListener() {},
      removeEventListener() {},
    };
    const columns = Array.from({ length: 10 }, (_, i) => ({ key: `c${i}` }));
    const columnWidths = Object.fromEntries(columns.map((column) => [column.key, 100]));
    const { result } = renderHook(() => useBoardColumnWindow({
      scrollRef: { current: el },
      columns,
      columnWidths,
      overscanCols: 0,
      enabled: true,
      getScale: () => 0.85,
    }));

    expect(result.current.colStart).toBe(2);
  });
});

describe('computeBoardColumnWindow', () => {
  it('starts the window after pinned columns so sticky cells stay mounted', () => {
    const result = computeBoardColumnWindow({
      offsets: offsetsFor(TEN_COLS),
      totalCols: 10,
      scrollLeft: 500,
      viewW: 200,
      overscanCols: 2,
      pinnedCount: 2,
    });

    expect(result.stickyCount).toBe(2);
    expect(result.colStart).toBeGreaterThanOrEqual(2);
    expect(result.leftSpanCount).toBe(result.colStart - 2);
  });

  it('does not put pinned columns in the virtualized slice after scrolling right', () => {
    const result = computeBoardColumnWindow({
      offsets: offsetsFor(TEN_COLS),
      totalCols: 10,
      scrollLeft: 800,
      viewW: 200,
      overscanCols: 2,
      pinnedCount: 2,
    });

    expect(result.colStart).toBeGreaterThanOrEqual(2);
    expect(result.colStart).toBeGreaterThan(2);
    expect(result.leftSpanCount).toBe(result.colStart - 2);
  });

  it('uses a zero left spacer at scroll 0 when columns are pinned', () => {
    const result = computeBoardColumnWindow({
      offsets: offsetsFor(TEN_COLS),
      totalCols: 10,
      scrollLeft: 0,
      viewW: 400,
      overscanCols: 2,
      pinnedCount: 2,
    });

    expect(result.colStart).toBe(2);
    expect(result.leftSpanCount).toBe(0);
    expect(result.stickyCount).toBe(2);
  });

  it('keeps previous unpinned behavior when pinnedCount is 0', () => {
    const result = computeBoardColumnWindow({
      offsets: offsetsFor(TEN_COLS),
      totalCols: 10,
      scrollLeft: 500,
      viewW: 200,
      overscanCols: 2,
      pinnedCount: 0,
    });

    expect(result.stickyCount).toBe(0);
    expect(result.colStart).toBe(3);
    expect(result.leftSpanCount).toBe(3);
  });
});

describe('resolveBoardRowColumnSlices', () => {
  const columns = [
    { key: 'order' },
    { key: 'supplier' },
    { key: 'status' },
    { key: 'qty' },
    { key: 'date' },
  ];

  it('always includes sticky columns even when the window starts further right', () => {
    const slices = resolveBoardRowColumnSlices(columns, {
      stickyCount: 2,
      colStart: 4,
      colEnd: 5,
      leftSpanCount: 2,
      rightSpanCount: 0,
    });

    expect(slices.stickyColumns.map((column) => column.key)).toEqual(['order', 'supplier']);
    expect(slices.windowColumns.map((column) => column.key)).toEqual(['date']);
    expect(slices.leftSpanCount).toBe(2);
  });

  it('does not duplicate sticky columns when the window still starts at 0', () => {
    const slices = resolveBoardRowColumnSlices(columns, {
      stickyCount: 2,
      colStart: 0,
      colEnd: 5,
      leftSpanCount: 0,
      rightSpanCount: 0,
    });

    expect(slices.stickyColumns.map((column) => column.key)).toEqual(['order', 'supplier']);
    expect(slices.windowColumns.map((column) => column.key)).toEqual(['status', 'qty', 'date']);
  });
});
