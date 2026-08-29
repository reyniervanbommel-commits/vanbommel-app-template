import { useCallback, useEffect, useRef, useState } from 'react';
import { createTabBarDragSession, measureTabBarOverflow, nextTabBarScrollLeft } from './tabBarOverflow';

const INITIAL = { overflow: false, canScrollLeft: false, canScrollRight: false };

function revealChildHorizontally(scroller, child) {
  if (!scroller || !child || typeof child.getBoundingClientRect !== 'function') return;
  const scrollerBox = scroller.getBoundingClientRect();
  const childBox = child.getBoundingClientRect();
  if (childBox.left < scrollerBox.left) scroller.scrollLeft += childBox.left - scrollerBox.left;
  else if (childBox.right > scrollerBox.right) scroller.scrollLeft += childBox.right - scrollerBox.right;
}

function blockNextClick(el) {
  const block = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  el.addEventListener('click', block, { capture: true, once: true });
}

/**
 * Tracks horizontal overflow of a tab scroller and maps wheel/chevron/drag scrolling.
 * @param {unknown} contentKey
 * @param {string} [activeTabId]
 * @returns {{
 *   scrollerRef: { current: HTMLElement | null },
 *   overflow: boolean,
 *   canScrollLeft: boolean,
 *   canScrollRight: boolean,
 *   isDragging: boolean,
 *   scrollByPage: (direction: number) => void,
 * }}
 */
export function useTabBarOverflow(contentKey, activeTabId) {
  const scrollerRef = useRef(null);
  const [state, setState] = useState(INITIAL);
  const [isDragging, setIsDragging] = useState(false);

  const update = useCallback(() => {
    setState(measureTabBarOverflow(scrollerRef.current));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;

    update();
    el.addEventListener('scroll', update, { passive: true });

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(el);
    if (el.firstElementChild) observer?.observe(el.firstElementChild);

    const handleWheel = (event) => {
      if (event.ctrlKey || el.scrollWidth <= el.clientWidth) return;
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);
      if (absY <= absX || !event.deltaY) return;
      el.scrollLeft += event.deltaY;
      event.preventDefault();
    };
    el.addEventListener('wheel', handleWheel, { passive: false });

    const session = createTabBarDragSession();
    let pointerId = null;

    const handlePointerDown = (event) => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      if (el.scrollWidth <= el.clientWidth) return;
      pointerId = event.pointerId;
      session.start(event.clientX, el.scrollLeft);
      if (typeof el.setPointerCapture === 'function') el.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (pointerId !== event.pointerId) return;
      const nextLeft = session.move(event.clientX);
      if (nextLeft == null) return;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      setIsDragging(true);
      el.scrollLeft = Math.min(max, Math.max(0, nextLeft));
      event.preventDefault();
    };

    const endDrag = (event) => {
      if (pointerId !== event.pointerId) return;
      const dragged = session.isDragging();
      pointerId = null;
      setIsDragging(false);
      if (typeof el.releasePointerCapture === 'function' && event.pointerId != null) {
        try {
          el.releasePointerCapture(event.pointerId);
        } catch {
          // Capture may already be released.
        }
      }
      if (dragged) blockNextClick(el);
    };

    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    return () => {
      el.removeEventListener('scroll', update);
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
      observer?.disconnect();
    };
  }, [contentKey, update]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !activeTabId) return;
    const safeId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(activeTabId)
      : activeTabId;
    revealChildHorizontally(el, el.querySelector(`[data-tab-id="${safeId}"]`));
    update();
  }, [activeTabId, contentKey, update]);

  const scrollByPage = useCallback((direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    const nextLeft = nextTabBarScrollLeft(el, direction);
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ left: nextLeft, behavior: 'smooth' });
      return;
    }
    el.scrollLeft = nextLeft;
  }, []);

  return {
    scrollerRef,
    overflow: state.overflow,
    canScrollLeft: state.canScrollLeft,
    canScrollRight: state.canScrollRight,
    isDragging,
    scrollByPage,
  };
}
