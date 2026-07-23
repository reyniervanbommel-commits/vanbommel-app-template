// In-memory cache voor BI-grafiekdata die navigatie overleeft (maar niet een harde refresh).
//
// Bij terugkeer naar /bi tonen we de gecachte series meteen (instant paint) en beslist een
// lichtgewicht revision-check (GET /api/bi/revision) of ze nog actueel zijn. Verandert de revision,
// dan legen we de cache en halen we opnieuw op. Alleen in-memory (geen localStorage) conform
// .cursor/rules/data-en-security.mdc: bord-data blijft niet buiten de tab-sessie bestaan.

let cachedRevision = null;
const seriesByKey = new Map();

/** Huidige gecachte revision (of null). */
export function getBiRevision() {
  return cachedRevision;
}

/**
 * Zet de revision. Wijkt die af van de gecachte revision, dan is alle gecachte data stale en
 * wordt de cache geleegd.
 */
export function setBiRevision(next) {
  const value = next ?? null;
  if (value !== cachedRevision) {
    seriesByKey.clear();
    cachedRevision = value;
  }
}

/** Gecachte series voor een chart-key (of undefined). */
export function getBiSeries(key) {
  return seriesByKey.get(key);
}

/** Bewaar series voor een chart-key. */
export function setBiSeries(key, series) {
  seriesByKey.set(key, series);
}

/** Leeg de volledige cache (bv. bij logout). */
export function clearBiCache() {
  cachedRevision = null;
  seriesByKey.clear();
}
