// In-memory cache voor BI-grafiekdata die navigatie overleeft (maar niet een harde refresh).
//
// Bij terugkeer naar /bi tonen we de gecachte series meteen (instant paint) en beslist een
// lichtgewicht revision-check (GET /api/bi/revision) of ze nog actueel zijn. Verandert de revision,
// dan legen we de cache en halen we opnieuw op. Alleen in-memory (geen localStorage) conform
// .cursor/rules/data-en-security.mdc: bord-data blijft niet buiten de tab-sessie bestaan.

let cachedRevision = null;
const seriesByKey = new Map();
let chartsCache = null;
const metaByBoard = new Map();
const metaInFlight = new Map();
let chartsInFlight = null;

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

/** Gecachte chart-definities (of null als er nog geen prefetch/fetch was). */
export function getBiCharts() {
  return chartsCache;
}

/** Bewaar de chart-lijst die `/bi/charts` teruggeeft. */
export function setBiCharts(charts) {
  chartsCache = Array.isArray(charts) ? charts : [];
}

/** Gecachte kolom-metadata per boardKey (of null). */
export function getBiMeta(boardKey) {
  return metaByBoard.get(boardKey) || null;
}

/** Bewaar `/bi/meta/:boardKey` zodat de BI-pagina de spinner kan overslaan. */
export function setBiMeta(boardKey, meta) {
  if (!boardKey) return;
  metaByBoard.set(boardKey, meta || { columns: [], measureColumns: [] });
}

function normalizeMeta(data) {
  return {
    columns: Array.isArray(data?.columns) ? data.columns : [],
    measureColumns: Array.isArray(data?.measureColumns) ? data.measureColumns : [],
  };
}

/**
 * One in-flight `/bi/meta` per board. Prefetch and BiPage share this so the first
 * click does not pay for two identical 4–5 s reads.
 */
export function loadBiMeta(boardKey, fetcher, { force = false } = {}) {
  if (!boardKey || typeof fetcher !== 'function') {
    return Promise.resolve(getBiMeta(boardKey) || { columns: [], measureColumns: [] });
  }
  if (!force) {
    const cached = getBiMeta(boardKey);
    if (cached) return Promise.resolve(cached);
    if (metaInFlight.has(boardKey)) return metaInFlight.get(boardKey);
  }
  const pending = Promise.resolve(fetcher())
    .then((data) => {
      const meta = normalizeMeta(data);
      setBiMeta(boardKey, meta);
      return meta;
    })
    .finally(() => {
      if (metaInFlight.get(boardKey) === pending) metaInFlight.delete(boardKey);
    });
  metaInFlight.set(boardKey, pending);
  return pending;
}

/**
 * One in-flight `/bi/charts`. Same sharing as `loadBiMeta`.
 */
export function loadBiCharts(fetcher, { force = false } = {}) {
  if (typeof fetcher !== 'function') {
    return Promise.resolve(getBiCharts() || []);
  }
  if (!force) {
    const cached = getBiCharts();
    if (cached) return Promise.resolve(cached);
    if (chartsInFlight) return chartsInFlight;
  }
  const pending = Promise.resolve(fetcher())
    .then((data) => {
      const charts = Array.isArray(data?.charts) ? data.charts : (Array.isArray(data) ? data : []);
      setBiCharts(charts);
      return charts;
    })
    .finally(() => {
      if (chartsInFlight === pending) chartsInFlight = null;
    });
  chartsInFlight = pending;
  return pending;
}

/** Leeg de volledige cache (bv. bij logout). */
export function clearBiCache() {
  cachedRevision = null;
  seriesByKey.clear();
  chartsCache = null;
  metaByBoard.clear();
  metaInFlight.clear();
  chartsInFlight = null;
}
