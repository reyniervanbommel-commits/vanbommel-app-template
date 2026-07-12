import { useEffect } from 'react';

/**
 * Lock trackpad wheel scrolling to one dominant axis.
 * @param {{ current: HTMLElement | null }} containerRef
 */
export default function useAxisLockedScroll(containerRef) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const handleWheel = (event) => {
      if (event.ctrlKey) return;
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);
      if (!absX || !absY) return;

      if (absX >= absY) {
        container.scrollLeft += event.deltaX;
      } else {
        container.scrollTop += event.deltaY;
      }
      event.preventDefault();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef]);
}
