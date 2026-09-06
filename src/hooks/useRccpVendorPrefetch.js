import { useCallback, useEffect, useRef } from 'react';
import { prefetchRccpAnalysis } from '../utils/rccpAnalysisPrefetch';
import { rccpPlanningDateModeList } from '../components/rccp/rccpPeriodGrain';

const PREFETCH_DEBOUNCE_MS = 250;

/**
 * Debounced "highlight" trigger voor de RCCP-vendor-zoeklijst: laadt de analyse voor een
 * vendor alvast op de achtergrond zodra de gebruiker die waarschijnlijk gaat kiezen (hover of
 * keyboard-highlight in de dropdown, of een exacte match tijdens het typen). Zo voelt de
 * daadwerkelijke selectie instant aan (data komt al uit cache), zonder bij elke toetsaanslag
 * een apiRequest te vuren.
 *
 * Input: het actieve ISO-weekvenster (fromYear/fromWeek/toYear/toWeek).
 * Output: `highlightVendor(vendorAccount)` — aanroepen bij hover/highlight/exacte match.
 */
export function useRccpVendorPrefetch(window, planningDateModes) {
  const timeoutRef = useRef(null);
  const pendingVendorRef = useRef('');

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const highlightVendor = useCallback((vendorAccount) => {
    if (!vendorAccount) return;
    pendingVendorRef.current = vendorAccount;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      rccpPlanningDateModeList(planningDateModes).forEach((mode) => {
        prefetchRccpAnalysis(window, pendingVendorRef.current, mode);
      });
    }, PREFETCH_DEBOUNCE_MS);
  }, [window, planningDateModes]);

  return highlightVendor;
}
