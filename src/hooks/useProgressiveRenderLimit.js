import { useEffect, useState } from 'react';

// Het board rendert bij ~2000 orders tienduizenden cellen. In één keer mounten blokkeert de
// hoofdthread seconden; daarom eerst een schermvullend eerste blok en de rest in idle-brokken.
// Filteren/sorteren/groeperen blijft over de volledige set gaan — dit begrenst alleen wat er
// in de DOM staat, niet welke rijen er zijn.
const FIRST_CHUNK = 50;
const NEXT_CHUNK = 250;

const requestIdle = typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
  ? window.requestIdleCallback
  : (cb) => setTimeout(() => cb(), 16);
const cancelIdle = typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function'
  ? window.cancelIdleCallback
  : clearTimeout;

/**
 * Groeit van FIRST_CHUNK naar totalCount zolang de browser tijd over heeft.
 * De teller begint opnieuw zodra resetKey verandert (andere filter/sortering/groepering).
 */
export function useProgressiveRenderLimit(totalCount, resetKey, forceAll = false) {
  const [limit, setLimit] = useState(FIRST_CHUNK);

  useEffect(() => {
    setLimit(FIRST_CHUNK);
  }, [resetKey]);

  useEffect(() => {
    if (limit >= totalCount) return undefined;
    const handle = requestIdle(() => setLimit((current) => current + NEXT_CHUNK));
    return () => cancelIdle(handle);
  }, [limit, totalCount]);

  // forceAll: iets zoekt een specifieke rij in de DOM (locate vanuit het remarks-paneel);
  // die mag niet mislukken omdat hij nog niet gemount was.
  return forceAll || limit >= totalCount ? totalCount : limit;
}
