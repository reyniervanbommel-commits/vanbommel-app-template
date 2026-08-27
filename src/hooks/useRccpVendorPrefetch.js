import { useCallback, useEffect, useRef } from 'react';
import { prefetchRccpAnalysis } from '../utils/rccpAnalysisPrefetch';

const PREFETCH_DEBOUNCE_MS = 250;

/**
 * Debounced "highlight" trigger voor de RCCP-vendor-zoeklijst: laadt de analyse voor een
 * vendor alvast op de achtergrond zodra de gebruiker die waarschijnlijk gaat kiezen (hover of
 * keyboard-highlight in de dropdown, of een exacte match tijdens het typen). Zo voelt de
 * daadwerkelijke selectie instant aan (data komt al uit cache), zonder bij elke toetsaanslag
 * een apiRequest te vuren.
 *
 * Input: het actieve ISO-weekvenster (fromYear/fromWeek/toYear/toWeek) en de
 * planning-datum (`requested` | `confirmed`) zodat prefetch dezelfde cache-key
 * gebruikt als de echte analysis-fetch.
 * Output: `highlightVendor(vendorAccount)` — aanroepen bij hover/highlight/exacte match.
 */
export function useRccpVendorPrefetch(window, planningDate) {
  const timeoutRef = useRef(null);
  const pendingVendorRef = useRef('');

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const highlightVendor = useCallback((vendorAccount) => {
    if (!vendorAccount) return;
    pendingVendorRef.current = vendorAccount;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      prefetchRccpAnalysis(window, pendingVendorRef.current, planningDate);
    }, PREFETCH_DEBOUNCE_MS);
  }, [window, planningDate]);

  return highlightVendor;
}
