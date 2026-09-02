import { startTransition, useEffect, useMemo, useState } from 'react';
import { measure } from '../utils/perf';

/**
 * Viewport window for board rows.
 *
 * Ondersteunt zowel vaste rijhoogte (rowHeightPx) als variabele hoogtes (rowHeights),
 * zodat een opengeklapte order — die extra hoogte inneemt door zijn subregel-tabel —
 * de virtualisatie NIET meer hoeft uit te schakelen. Alleen [start, end) blijft gemount;
 * spacer-rijen bewaren de scrollhoogte via prefix-sommen van de werkelijke hoogtes.
 *
 * @param {object}        params
 * @param {{current: HTMLElement|null}} params.scrollRef  Scroll-container.
 * @param {number}        params.totalCount               Aantal slots.
 * @param {number}        params.rowHeightPx              Basis-/schatting-hoogte per rij.
 * @param {number[]|null} [params.rowHeights]             Optioneel: werkelijke hoogte per slot.
 * @param {number}        [params.overscan]               Extra rijen boven/onder de viewport.
 * @param {boolean}       [params.enabled]                Windowing aan/uit.
 * @param {() => number}  [params.getScale]               Actuele visuele zoomschaal.
 * @param {Function|null} [params.subscribeScale]          Abonneert op schaalwijzigingen.
 * @returns {{ start: number, end: number, topPadPx: number, bottomPadPx: number }}
 */
function buildOffsets(totalCount, rowHeights, rowHeightPx) {
  const offsets = new Array(totalCount + 1);
  offsets[0] = 0;
  for (let i = 0; i < totalCount; i += 1) {
    const height = rowHeights && rowHeights[i] > 0 ? rowHeights[i] : rowHeightPx;
    offsets[i + 1] = offsets[i] + height;
  }
  return offsets;
}

// Grootste index i waarvoor offsets[i] <= scrollTop (de rij die de bovenrand raakt).
function findStartIndex(offsets, scrollTop) {
  let lo = 0;
  let hi = offsets.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] <= scrollTop) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

// Kleinste index i waarvoor offsets[i] >= bottom (eerste rij voorbij de onderrand).
function findEndIndex(offsets, bottom) {
  let lo = 0;
  let hi = offsets.length - 1;
  let ans = offsets.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] >= bottom) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return ans;
}

export function useBoardRowWindow({
  scrollRef,
  totalCount,
  rowHeightPx,
  rowHeights = null,
  overscan = 12,
  enabled = true,
  getScale = () => 1,
  subscribeScale = null,
}) {
  const offsets = useMemo(
    () => buildOffsets(totalCount, rowHeights, rowHeightPx),
    [totalCount, rowHeights, rowHeightPx]
  );
  const totalHeight = offsets[totalCount] || 0;

  const [range, setRange] = useState(() => ({ start: 0, end: Math.min(totalCount, 40 + overscan * 2) }));

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

    // B2: vorige scrollTop bijhouden voor directional overscan
    let prevScrollTop = el.scrollTop;

    const update = () => {
      const viewH = el.clientHeight || 600;
      const scrollTop = el.scrollTop;
      const scale = getScale() || 1;
      // B2: asymmetrische overscan op basis van scrollrichting — D365 F&O VirtualScrollViewer patroon
      // overscanBefore minimaal 4 zodat sticky group headers voldoende in het window blijven
      // voor een vloeiende overgang naar het pin-mechanisme (geen zichtbare sprong).
      const scrollingDown = scrollTop >= prevScrollTop;
      prevScrollTop = scrollTop;
      const overscanBefore = scrollingDown ? 4 : overscan;
      const overscanAfter = scrollingDown ? overscan : 4;

      const first = findStartIndex(offsets, scrollTop / scale);
      const start = Math.max(0, first - overscanBefore);
      const last = findEndIndex(offsets, (scrollTop + viewH) / scale);
      const end = Math.min(totalCount, last + overscanAfter);
      // A3: window-updates zijn niet-urgent — input/animatie krijgt prioriteit
      startTransition(() => {
        setRange((prev) => (
          prev.start === start && prev.end === end && prev.scale === scale
            ? prev
            : { start, end, scale }
        ));
      });
    };

    // A0: rAF-gate — batcht scroll-events op de browser-refresh-rate (BL-004)
    let rafId = null;
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        measure('board:window-update', update);
      });
    };

    update();
    el.addEventListener('scroll', scheduleUpdate, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleUpdate) : null;
    ro?.observe(el);
    const unsubscribeScale = subscribeScale?.(scheduleUpdate);
    return () => {
      el.removeEventListener('scroll', scheduleUpdate);
      ro?.disconnect();
      unsubscribeScale?.();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [enabled, getScale, overscan, offsets, scrollRef, subscribeScale, totalCount]);

  if (!enabled) {
    return { start: 0, end: totalCount, topPadPx: 0, bottomPadPx: 0 };
  }

  const start = Math.min(range.start, Math.max(0, totalCount));
  const end = Math.min(Math.max(range.end, start), totalCount);
  const scale = range.scale ?? 1;
  return {
    start,
    end,
    topPadPx: (offsets[start] || 0) * scale,
    bottomPadPx: Math.max(0, (totalHeight - (offsets[end] || 0)) * scale),
  };
}
