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
    if (PERF_BRIDGE_ENABLED) {
      // eslint-disable-next-line no-console
      console.debug(`[perf] measure ${label} → ${ms}ms`);
    }
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

// ---------------------------------------------------------------------------
// Dev/preview-brug voor de perf-review skill (`/perf-check`).
//
// Twee uitleeswegen, want niet elke omgeving kan JS in de pagina uitvoeren:
//   1. window.__perf.*      — handmatig in de console, of via een evaluate-tool
//   2. console.debug('[perf] …') — leesbaar met alleen een console-uitleestool,
//      wat de browser-MCP in Cursor wél heeft en een evaluate-tool niet
// Daarom installeren de observers zichzelf en loggen ze; er is geen opstart-call nodig.
// Nooit in productie — zelfde conditie als PERF_ENABLED in api.js.
// ---------------------------------------------------------------------------

// Volgorde is bewust: de env-check staat vóóraan zodat hij bij een productie-build naar een
// literal `false` vouwt en de minifier dit hele blok weggooit. Zet je `typeof window` ervoor,
// dan blijft de code in de bundel staan (dead, maar aanwezig).
const PERF_BRIDGE_ENABLED =
  (import.meta.env.DEV ||
    import.meta.env.VITE_APP_ENV === 'dev' ||
    import.meta.env.VITE_APP_ENV === 'preview') &&
  typeof window !== 'undefined';

// Interacties trager dan dit worden gelogd. Onder ~100 ms voelt een klik direct.
const SLOW_INTERACTION_MS = 100;

function logPerf(kind, payload) {
  // eslint-disable-next-line no-console
  console.debug(`[perf] ${kind} ${JSON.stringify(payload)}`);
}

function installPerfObservers() {
  if (typeof PerformanceObserver !== 'function') return;

  // Interactie-latentie: welk element kost tijd, en waaraan gaat die op.
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const el = e.target;
        logPerf('interaction', {
          event: e.name,
          target: el ? `${el.tagName}${el.className ? '.' + String(el.className).slice(0, 60) : ''}` : null,
          text: el?.textContent ? el.textContent.trim().slice(0, 40) : null,
          total: Math.round(e.duration),
          inputDelay: Math.round(e.processingStart - e.startTime),
          processing: Math.round(e.processingEnd - e.processingStart),
          render: Math.round(e.startTime + e.duration - e.processingEnd),
        });
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: SLOW_INTERACTION_MS });
  } catch {
    /* Event Timing niet ondersteund — geen interactie-attributie */
  }

  // Blokkerende frames: welk script houdt de UI tegen (Chromium-only).
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.blockingDuration < 50) continue;
        logPerf('longframe', {
          duration: Math.round(e.duration),
          blocking: Math.round(e.blockingDuration),
          scripts: (e.scripts || []).slice(0, 3).map((s) => ({
            ms: Math.round(s.duration),
            source: `${s.sourceURL || '?'}:${s.sourceFunctionName || '?'}`,
          })),
        });
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  } catch {
    /* LoAF niet ondersteund — val terug op de interactie-opsplitsing */
  }
}

if (PERF_BRIDGE_ENABLED) {
  window.__perf = {
    timings: getApiTimings,
    navigation: getNavigationTiming,
    resourceKB: getResourceTransferKB,
    // Leeg de buffer zodat een volgende meting alleen die ene interactie bevat.
    reset: () => {
      entries.length = 0;
    },
    // Dump alles als één console-regel — de uitleesweg zonder evaluate-tool.
    dump: (label) => {
      logPerf('dump', {
        label: label || null,
        navigation: getNavigationTiming(),
        resourceKB: getResourceTransferKB(),
        entries: getApiTimings(),
      });
    },
  };
  installPerfObservers();

  // Paginalading: één regel zodra de load-event-timings definitief zijn.
  window.addEventListener('load', () => {
    setTimeout(() => logPerf('navigation', {
      url: window.location.pathname,
      ...(getNavigationTiming() || {}),
      resourceKB: getResourceTransferKB(),
    }), 0);
  });
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
