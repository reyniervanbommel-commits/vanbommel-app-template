// Dev/preview: laadt scout-baseline uit /perf-baseline.json (public/) voor HUD vergelijking.
// Wordt bijgewerkt door perf-scout / perf-review — niet in productie bundles gebruiken.

let cachedBaseline = null;
let loadPromise = null;

export async function loadPerfBaseline() {
  if (cachedBaseline) return cachedBaseline;
  if (loadPromise) return loadPromise;
  loadPromise = fetch('/perf-baseline.json', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null)
    .then((data) => {
      cachedBaseline = data;
      return data;
    });
  return loadPromise;
}

export function invalidatePerfBaselineCache() {
  cachedBaseline = null;
  loadPromise = null;
}

function pathMatches(entry, watch) {
  const path = String(entry?.path || '');
  if (watch.pathIncludes && !path.includes(watch.pathIncludes)) return false;
  if (watch.pathExcludes && path.includes(watch.pathExcludes)) return false;
  if (watch.method && entry?.method !== watch.method) return false;
  return true;
}

/** Laatste timing in buffer die bij een watch-item hoort. */
export function findLatestForWatch(timings, watch) {
  if (!Array.isArray(timings) || !watch) return null;
  return timings.find((t) => pathMatches(t, watch)) || null;
}

/** Rijen voor HUD: baseline vs last call + delta. */
export function buildBaselineCompareRows(baseline, timings) {
  const watch = baseline?.hudWatch;
  if (!Array.isArray(watch) || !watch.length) return [];

  return watch.map((item) => {
    const latest = findLatestForWatch(timings, item);
    const currentMs = latest?.ms ?? null;
    const baseMs = item.baselineMs ?? null;
    const delta = currentMs != null && baseMs != null ? currentMs - baseMs : null;
    return {
      id: item.id,
      label: item.label,
      baselineMs: baseMs,
      currentMs,
      delta,
      matchedPath: latest?.path ?? null,
    };
  });
}
