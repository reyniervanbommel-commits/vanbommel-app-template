const HORIZONTAL_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);

/**
 * @param {Element | null | undefined} element
 */
export function isHorizontallyScrollable(element) {
  if (!(element instanceof Element)) return false;
  const { overflowX } = window.getComputedStyle(element);
  if (!HORIZONTAL_OVERFLOW.has(overflowX)) return false;
  return element.scrollWidth > element.clientWidth;
}

/**
 * @param {Element | EventTarget | null} start
 * @param {number} deltaX
 */
export function canConsumeHorizontalWheel(start, deltaX) {
  if (!deltaX || !(start instanceof Element)) return false;

  let node = start;
  while (node && node !== document.documentElement) {
    if (isHorizontallyScrollable(node)) {
      const maxScrollLeft = node.scrollWidth - node.clientWidth;
      if (deltaX > 0 && node.scrollLeft < maxScrollLeft - 1) return true;
      if (deltaX < 0 && node.scrollLeft > 1) return true;
    }
    node = node.parentElement;
  }

  return false;
}

/**
 * @param {WheelEvent} event
 */
export function shouldPreventTrackpadNavigation(event) {
  if (!event.deltaX || event.ctrlKey) return false;
  return !canConsumeHorizontalWheel(event.target, event.deltaX);
}
