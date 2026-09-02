import { startTransition, useEffect, useMemo, useState } from 'react';

/**
 * Viewport window for board columns (horizontal virtualization).
 *
 * Tracks `scrollLeft` on the scroll container and returns which columns are currently
 * in view, plus the cumulative widths to use as colSpan-spacers left and right.
 *
 * Sticky (pinned) columns stay outside the virtualized slice so `position: sticky`
 * keeps working after scrolling right.
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
 * @param {() => number} [params.getScale]                 Current visual scale for stored widths.
 * @param {((listener: () => void) => (() => void)|void)|null} [params.subscribeScale]
 *                                                           Subscribe to visual scale changes.
 * @returns {{ colStart, colEnd, leftSpanCount, rightSpanCount, stickyCount }}
 */

export function countLeadingStickyColumns(columns) {
  if (!Array.isArray(columns)) return 0;
  let count = 0;
  for (const column of columns) {
    if (!Number.isFinite(Number(column?.stickyLeft))) break;
    count += 1;
  }
  return count;
}

export function computeBoardColumnWindow({
  offsets,
  totalCols,
  scrollLeft,
  viewW,
  overscanCols = 2,
  pinnedCount = 0,
}) {
  const safePinned = Math.max(0, Math.min(Number(pinnedCount) || 0, totalCols));
  let start = 0;
  for (let i = 0; i < totalCols; i += 1) {
    if (offsets[i + 1] > scrollLeft) {
      start = i;
      break;
    }
  }
  let end = totalCols;
  for (let i = totalCols - 1; i >= 0; i -= 1) {
    if (offsets[i] < scrollLeft + viewW) {
      end = i + 1;
      break;
    }
  }
  const rawStart = Math.max(0, start - overscanCols);
  const colStart = Math.max(safePinned, rawStart);
  const colEnd = Math.min(totalCols, end + overscanCols);
  return {
    colStart,
    colEnd,
    leftSpanCount: Math.max(0, colStart - safePinned),
    rightSpanCount: Math.max(0, totalCols - colEnd),
    stickyCount: safePinned,
  };
}

export function resolveBoardRowColumnSlices(columns, colWindow) {
  const list = Array.isArray(columns) ? columns : [];
  if (!colWindow) {
    return {
      stickyColumns: [],
      windowColumns: list,
      leftSpanCount: 0,
      rightSpanCount: 0,
    };
  }
  const stickyCount = Math.max(0, Number(colWindow.stickyCount) || 0);
  const windowStart = Math.max(Number(colWindow.colStart) || 0, stickyCount);
  return {
    stickyColumns: list.slice(0, stickyCount),
    windowColumns: list.slice(windowStart, colWindow.colEnd),
    leftSpanCount: colWindow.leftSpanCount || 0,
    rightSpanCount: colWindow.rightSpanCount || 0,
  };
}

export function useBoardColumnWindow({
  scrollRef,
  columns,
  columnWidths,
  overscanCols = 2,
  enabled = true,
  getScale = () => 1,
  subscribeScale = null,
}) {
  const totalCols = columns.length;
  const pinnedCount = useMemo(() => countLeadingStickyColumns(columns), [columns]);

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
      const scale = typeof getScale === 'function' ? getScale() : 1;
      const visualOffsets = scale === 1 ? offsets : offsets.map((value) => value * scale);
      const next = computeBoardColumnWindow({
        offsets: visualOffsets,
        totalCols,
        scrollLeft: el.scrollLeft,
        viewW: el.clientWidth || 1200,
        overscanCols,
        pinnedCount,
      });
      startTransition(() => {
        setRange((prev) => (
          prev.start === next.colStart && prev.end === next.colEnd ? prev : { start: next.colStart, end: next.colEnd }
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
    const unsubscribe = typeof subscribeScale === 'function'
      ? subscribeScale(scheduleUpdate)
      : null;
    return () => {
      el.removeEventListener('scroll', scheduleUpdate);
      unsubscribe?.();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [
    enabled,
    getScale,
    offsets,
    overscanCols,
    pinnedCount,
    scrollRef,
    subscribeScale,
    totalCols,
  ]);

  if (!enabled) {
    return {
      colStart: 0,
      colEnd: totalCols,
      leftSpanCount: 0,
      rightSpanCount: 0,
      stickyCount: 0,
    };
  }

  const stickyCount = pinnedCount;
  return {
    colStart: range.start,
    colEnd: range.end,
    leftSpanCount: Math.max(0, range.start - stickyCount),
    rightSpanCount: totalCols - range.end,
    stickyCount,
  };
}
