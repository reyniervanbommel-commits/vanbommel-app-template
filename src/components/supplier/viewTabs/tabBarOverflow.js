const OVERFLOW_EPS = 1;

/**
 * Meet of een tab-scroller horizontaal overflowt en in welke richting.
 * @param {{ scrollLeft: number, clientWidth: number, scrollWidth: number } | null | undefined} el
 * @returns {{ overflow: boolean, canScrollLeft: boolean, canScrollRight: boolean }}
 */
export function measureTabBarOverflow(el) {
  if (!el) return { overflow: false, canScrollLeft: false, canScrollRight: false };
  const maxScroll = el.scrollWidth - el.clientWidth;
  const overflow = maxScroll > OVERFLOW_EPS;
  return {
    overflow,
    canScrollLeft: overflow && el.scrollLeft > OVERFLOW_EPS,
    canScrollRight: overflow && maxScroll - el.scrollLeft > OVERFLOW_EPS,
  };
}

/**
 * Dominant wheel-delta voor horizontale tab-scroll.
 * @param {number} deltaX
 * @param {number} deltaY
 * @returns {number}
 */
export function tabBarWheelDelta(deltaX, deltaY) {
  return Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
}

/**
 * Volgende scrollLeft bij sleep (muis naar rechts = content naar rechts).
 * @param {{ scrollLeft: number, clientWidth: number, scrollWidth: number } | null | undefined} el
 * @param {number} pointerDeltaX
 * @returns {number}
 */
export function nextTabBarDragScrollLeft(el, pointerDeltaX) {
  if (!el) return 0;
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  return Math.min(max, Math.max(0, el.scrollLeft - pointerDeltaX));
}

const DRAG_THRESHOLD_PX = 5;

/**
 * Sleepsessie voor klik-vasthouden op de tab-scroller.
 * @returns {{
 *   start: (clientX: number, scrollLeft: number) => void,
 *   move: (clientX: number) => number | null,
 *   isDragging: () => boolean,
 * }}
 */
export function createTabBarDragSession() {
  let startX = 0;
  let startScroll = 0;
  let dragging = false;
  return {
    start(clientX, scrollLeft) {
      startX = clientX;
      startScroll = scrollLeft;
      dragging = false;
    },
    move(clientX) {
      const deltaX = clientX - startX;
      if (!dragging && Math.abs(deltaX) < DRAG_THRESHOLD_PX) return null;
      dragging = true;
      return startScroll - deltaX;
    },
    isDragging() {
      return dragging;
    },
  };
}

/**
 * Volgende scrollLeft na een pagina-stap (chevron).
 * @param {{ scrollLeft: number, clientWidth: number, scrollWidth: number } | null | undefined} el
 * @param {number} direction -1 = links, 1 = rechts
 * @returns {number}
 */
export function nextTabBarScrollLeft(el, direction) {
  if (!el) return 0;
  const page = Math.max(el.clientWidth * 0.7, 80);
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  return Math.min(max, Math.max(0, el.scrollLeft + direction * page));
}


