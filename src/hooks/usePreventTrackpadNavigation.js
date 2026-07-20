import { useEffect } from 'react';
import { shouldPreventTrackpadNavigation } from '../utils/trackpadNavigation';

/**
 * Blokkeert browser back/forward via horizontale trackpad-swipes,
 * behalve binnen containers die horizontaal kunnen scrollen.
 */
export function usePreventTrackpadNavigation() {
  useEffect(() => {
    const handleWheel = (event) => {
      if (shouldPreventTrackpadNavigation(event)) {
        event.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);
}
