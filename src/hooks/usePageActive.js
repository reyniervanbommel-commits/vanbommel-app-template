import { createContext, useContext } from 'react';

// Signaleert of de huidige (keep-alive) pagina zichtbaar/actief is. Keep-alive houdt pagina's
// gemount maar verborgen; hooks die alleen bij hertonen iets moeten doen (bv. een lichte
// revisie-check) luisteren hierop i.p.v. op mount. Default true zodat pagina's buiten de
// keep-alive-laag zich gewoon als "actief" gedragen.
export const PageActiveContext = createContext(true);

/**
 * @returns {boolean} true wanneer de omringende pagina momenteel de actieve route is.
 */
export function usePageActive() {
  return useContext(PageActiveContext);
}
