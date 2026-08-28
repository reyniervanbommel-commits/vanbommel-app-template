import { useEffect } from 'react';
import { usePageActive } from './usePageActive';
import { useRccpWindow } from './useRccpWindow';
import { runWhenIdleAndQuiet } from '../utils/idleWhenQuiet';
import { setDataPagesPrefetchParams, startDataPagesPrefetch } from '../utils/dataPagesPrefetch';

/**
 * Start ná board-idle het achtergrondwerk dat de KPI-tab, RCCP en BI alvast warm maakt.
 * Verlaat de gebruiker de PO-pagina vóór idle, dan start de prefetch meteen (geen cancel zonder start).
 * `enabled` moet pas true worden na de eerste succesvolle board-read (niet tijdens de skeleton).
 * @param {{ enabled: boolean, refreshKey: string|number, isSupplier?: boolean }} params
 */
export function useDataPagesPrefetch({ enabled, refreshKey, isSupplier = false }) {
  const pageActive = usePageActive();
  const { isoWindow, lastVendor, loaded: windowLoaded } = useRccpWindow();

  // Zodat de rail-hover (AppLayout) dezelfde parameters kan hergebruiken zonder zelf board-data
  // te kennen — ook al is idle nog niet klaar, en ook vanaf een andere pagina (PO blijft
  // keep-alive gemount). Niet opruimen bij unmount/hidden: de laatst bekende PO-staat blijft een
  // bruikbare basis voor een hover-kick totdat een nieuwere render hem vervangt.
  useEffect(() => {
    if (!windowLoaded || !refreshKey) return undefined;
    setDataPagesPrefetchParams({ refreshKey, lastVendor, isoWindow, isSupplier });
    return undefined;
  }, [windowLoaded, refreshKey, lastVendor, isoWindow, isSupplier]);

  useEffect(() => {
    if (!enabled || !windowLoaded || !refreshKey) return undefined;
    const params = { refreshKey, lastVendor, isoWindow, isSupplier };
    // Weg van de PO-pagina (keep-alive hidden) = waarschijnlijk onderweg naar RCCP/BI:
    // niet de idle-wacht cancellen zonder start, maar meteen prefetchen.
    if (!pageActive) {
      startDataPagesPrefetch(params);
      return undefined;
    }
    const handle = runWhenIdleAndQuiet(() => {
      startDataPagesPrefetch(params);
    });
    return () => handle.cancel();
  }, [enabled, pageActive, windowLoaded, refreshKey, lastVendor, isoWindow, isSupplier]);
}
