const DEFAULT_MARGIN = 8;

/**
 * Kiest of een kolommenu-flyout links of rechts van het parent-paneel past,
 * en klempt de verticale offset zodat de flyout in het viewport blijft.
 *
 * @param {{ width: number, height: number }} flyoutRect
 * @param {{ top: number, left: number, right: number }} parentRect
 * @param {{ width: number, height: number }} viewport
 * @param {{ margin?: number, requestedTop?: number }} [options]
 * @returns {{ alignLeft: boolean, top?: number }}
 */
export function resolveColumnMenuFlyoutPlacement(flyoutRect, parentRect, viewport, options = {}) {
  const margin = options.margin ?? DEFAULT_MARGIN;
  const width = Number(flyoutRect?.width) || 0;
  const height = Number(flyoutRect?.height) || 0;
  const spaceRight = (Number(viewport?.width) || 0) - (Number(parentRect?.right) || 0) - margin;
  const spaceLeft = (Number(parentRect?.left) || 0) - margin;
  const alignLeft = spaceRight < width && spaceLeft > spaceRight;

  if (options.requestedTop == null) {
    return { alignLeft };
  }

  let top = Number(options.requestedTop) || 0;
  const parentTop = Number(parentRect?.top) || 0;
  const absBottom = parentTop + top + height;
  const maxBottom = (Number(viewport?.height) || 0) - margin;
  if (absBottom > maxBottom) {
    top -= absBottom - maxBottom;
  }
  if (parentTop + top < margin) {
    top = margin - parentTop;
  }

  return { alignLeft, top };
}
