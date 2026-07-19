// Lichtgewicht perf-tracker (dev/preview) — geen dependencies.
// Houdt de laatste API-timings bij (ring buffer) en levert navigatie-timing (laadtijd) uit de
// standaard Navigation Timing API. Wordt gevoed door apiRequest (src/utils/api.js) en uitgelezen
// door het DevPerfOverlay. In productie wordt dit niet aangeroepen (zie PERF_ENABLED in api.js).

const MAX_ENTRIES = 40;
const entries = [];
const listeners = new Set();

// Meet een benoemd (a)sync CLIENT-blok met de User Timing API — verschijnt in DevTools →
// Performance én in de perf-HUD. Gebruik voor zware client-berekeningen (bijv. het opbouwen
// van een grote tabel-view), zodat ook toekomstige hotspots meetbaar zijn.
//   await measure('board:process', () => buildBoardRows(...))
export async function measure(label, fn) {
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const start = now();
  try {
    return await fn();
  } finally {
    const ms = Math.round(now() - start);
    try {
      if (typeof performance !== 'undefined' && typeof performance.measure === 'function') {
        performance.measure(label, { start, duration: ms });
      }
    } catch {
      /* niet-kritiek */
    }
    recordApiTiming({ method: 'ui', path: label, status: 0, ms, at: Date.now() });
  }
}

export function recordApiTiming(entry) {
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* een luisteraar-fout mag de meting niet breken */
    }
  });
}

export function getApiTimings() {
  return entries.slice();
}

export function subscribePerf(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Dev/preview-brug: maakt de metingen leesbaar vanuit de console en vanuit browser-automation
// (de perf-review skill leest hier uit). Nooit in productie — zelfde conditie als PERF_ENABLED.
if (
  typeof window !== 'undefined' &&
  (import.meta.env.DEV ||
    import.meta.env.VITE_APP_ENV === 'dev' ||
    import.meta.env.VITE_APP_ENV === 'preview')
) {
  window.__perf = {
    timings: getApiTimings,
    navigation: getNavigationTiming,
    resourceKB: getResourceTransferKB,
    // Leeg de buffer zodat een volgende meting alleen die ene interactie bevat.
    reset: () => {
      entries.length = 0;
    },
  };
}

// Navigatie-timing: TTFB, DOMContentLoaded en volledige load in ms sinds navigatiestart,
// plus het overgedragen aantal KB (na compressie) van het hoofddocument.
export function getNavigationTiming() {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
    return null;
  }
  const nav = performance.getEntriesByType('navigation')[0];
  if (!nav) return null;
  return {
    ttfb: Math.round(nav.responseStart),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    load: Math.round(nav.loadEventEnd || nav.duration),
    transferKB: nav.transferSize ? Math.round(nav.transferSize / 1024) : null,
  };
}

// Totale JS/CSS-transfer (na compressie) van alle geladen resources — geeft een indruk van
// hoeveel de code-splitting/compressie oplevert.
export function getResourceTransferKB() {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
    return null;
  }
  const res = performance.getEntriesByType('resource');
  let bytes = 0;
  for (const r of res) {
    if (r.initiatorType === 'script' || r.initiatorType === 'link') {
      bytes += r.transferSize || 0;
    }
  }
  return bytes ? Math.round(bytes / 1024) : null;
}
