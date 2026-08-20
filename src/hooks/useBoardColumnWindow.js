import { startTransition, useEffect, useMemo, useState } from 'react';

/**
 * Viewport window for board columns (horizontal virtualization).
 *
 * Tracks `scrollLeft` on the scroll container and returns which columns are currently
 * in view, plus the cumulative widths to use as colSpan-spacers left and right.
 *
 * Designed to work with table-layout:fixed — spacers use colSpan so the browser
 * uses header-determined column widths (body widths are irrelevant in fixed layout).
 *
 * @param {object}   params
 * @param {{current: HTMLElement|null}} params.scrollRef   Scroll container (same as row window).
 * @param {object[]} params.columns                        Visible columns in render order.
 * @param {object}   params.columnWidths                   Width per column key (px numbers).
 * @param {number}   [params.overscanCols]                 Extra columns left/right of viewport.
 * @param {boolean}  [params.enabled]                      Disable to render all columns.
 * @returns {{ colStart, colEnd, leftSpanCount, rightSpanCount }}
 */
export function useBoardColumnWindow({
  scrollRef,
  columns,
  columnWidths,
  overscanCols = 2,
  enabled = true,
}) {
  const totalCols = columns.length;

  // Cumulative left offset per column: offsets[i] = sum of widths[0..i-1]
  const offsets = useMemo(() => {
    const result = new Array(totalCols + 1);
    result[0] = 0;
    for (let i = 0; i < totalCols; i += 1) {
      const w = columnWidths[columns[i]?.key] ?? 120;
      result[i + 1] = result[i] + w;
    }
    return result;
  }, [columns, columnWidths, totalCols]);

  const [range, setRange] = useState(() => ({ start: 0, end: totalCols }));

  useEffect(() => {
    if (!enabled || totalCols === 0) {
      setRange({ start: 0, end: totalCols });
      return undefined;
    }

    const el = scrollRef?.current;
    if (!el) {
      setRange({ start: 0, end: totalCols });
      return undefined;
    }

    const update = () => {
      const scrollLeft = el.scrollLeft;
      const viewW = el.clientWidth || 1200;

      // Find first column whose right edge is beyond scrollLeft
      let start = 0;
      for (let i = 0; i < totalCols; i += 1) {
        if (offsets[i + 1] > scrollLeft) { start = i; break; }
      }
      // Find last column whose left edge is before scrollLeft + viewW
      let end = totalCols;
      for (let i = totalCols - 1; i >= 0; i -= 1) {
        if (offsets[i] < scrollLeft + viewW) { end = i + 1; break; }
      }

      const colStart = Math.max(0, start - overscanCols);
      const colEnd = Math.min(totalCols, end + overscanCols);

      startTransition(() => {
        setRange((prev) => (
          prev.start === colStart && prev.end === colEnd ? prev : { start: colStart, end: colEnd }
        ));
      });
    };

    let rafId = null;
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    };

    update();
    el.addEventListener('scroll', scheduleUpdate, { passive: true });
    return () => {
      el.removeEventListener('scroll', scheduleUpdate);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [enabled, offsets, overscanCols, scrollRef, totalCols]);

  if (!enabled) {
    return { colStart: 0, colEnd: totalCols, leftSpanCount: 0, rightSpanCount: 0 };
  }

  return {
    colStart: range.start,
    colEnd: range.end,
    leftSpanCount: range.start,
    rightSpanCount: totalCols - range.end,
  };
}
