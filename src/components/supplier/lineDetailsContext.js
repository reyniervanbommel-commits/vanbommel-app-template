import { createContext, useContext } from 'react';

// Lazy geladen sublijnen per order. Alleen de opengeklapte rijen consumeren deze context,
// zodat een binnenkomende regel-fetch niet het hele board hertekent.
export const LineDetailsContext = createContext(null);

export function useLineDetails() {
  return useContext(LineDetailsContext);
}
