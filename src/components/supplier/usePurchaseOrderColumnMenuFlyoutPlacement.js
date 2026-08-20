import { useLayoutEffect, useRef, useState } from 'react';
import { resolveColumnMenuFlyoutPlacement } from '../../utils/columnMenuFlyoutPlacement';

/**
 * Meet een kolommenu-flyout na layout en klapt/klemt die binnen het viewport.
 *
 * @param {{ active: boolean, requestedTop?: number, placementKey?: string }} options
 * @returns {{ ref: import('react').RefObject<HTMLElement | null>, alignLeft: boolean, top: number }}
 */
export function usePurchaseOrderColumnMenuFlyoutPlacement({ active, requestedTop, placementKey }) {
  const ref = useRef(null);
  const [alignLeft, setAlignLeft] = useState(false);
  const [top, setTop] = useState(requestedTop || 0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) {
      setAlignLeft(false);
      setTop(requestedTop || 0);
      return undefined;
    }

    const update = () => {
      const parent = el.closest('[data-column-menu-surface]') || el.offsetParent || el.parentElement;
      if (!parent) return;
      const next = resolveColumnMenuFlyoutPlacement(
        el.getBoundingClientRect(),
        parent.getBoundingClientRect(),
        { width: window.innerWidth, height: window.innerHeight },
        requestedTop == null ? undefined : { requestedTop }
      );
      setAlignLeft(next.alignLeft);
      if (next.top != null) setTop(next.top);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [active, requestedTop, placementKey]);

  return { ref, alignLeft, top };
}
