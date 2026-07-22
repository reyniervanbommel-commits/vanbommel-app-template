import { useEffect, useState } from 'react';

/**
 * Viewport window for fixed-height board rows.
 * Keeps only [start, end) slots mounted; spacers preserve scroll height.
 */
export function useBoardRowWindow({
  scrollRef,
  totalCount,
  rowHeightPx,
  overscan = 12,
  enabled = true,
}) {
  const fallbackEnd = Math.min(totalCount, 40 + overscan * 2);
  const [range, setRange] = useState(() => ({ start: 0, end: fallbackEnd }));

  useEffect(() => {
    if (!enabled) {
      setRange((prev) => (
        prev.start === 0 && prev.end === totalCount ? prev : { start: 0, end: totalCount }
      ));
      return undefined;
    }

    const el = scrollRef?.current;
    if (!el || totalCount <= 0) {
      const end = Math.min(totalCount, 40 + overscan * 2);
      setRange((prev) => (prev.start === 0 && prev.end === end ? prev : { start: 0, end }));
      return undefined;
    }

    const update = () => {
      const viewH = el.clientHeight || 600;
      const scrollTop = el.scrollTop;
      const visible = Math.max(1, Math.ceil(viewH / rowHeightPx));
      const start = Math.max(0, Math.floor(scrollTop / rowHeightPx) - overscan);
      const end = Math.min(totalCount, start + visible + overscan * 2);
      setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [enabled, overscan, rowHeightPx, scrollRef, totalCount]);

  if (!enabled) {
    return { start: 0, end: totalCount, topPadPx: 0, bottomPadPx: 0 };
  }

  const start = Math.min(range.start, Math.max(0, totalCount));
  const end = Math.min(Math.max(range.end, start), totalCount);
  return {
    start,
    end,
    topPadPx: start * rowHeightPx,
    bottomPadPx: Math.max(0, (totalCount - end) * rowHeightPx),
  };
}
