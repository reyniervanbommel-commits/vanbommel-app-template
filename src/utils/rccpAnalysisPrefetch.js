import { apiRequest } from './api';
import { buildAnalysisQuery } from '../components/rccp/rccpUtils';

// Korte in-memory cache (huidige sessie, geen bron van waarheid — zie data-en-security.mdc)
// die de RCCP-analyse voor een vendor+week-venster alvast op de achtergrond ophaalt zodra de
// gebruiker die vendor waarschijnlijk gaat kiezen (hover/keyboard-highlight in de zoeklijst,
// of een exacte match tijdens het typen). Bij echte selectie hergebruikt useRccpPage deze
// (in-flight of afgeronde) call in plaats van een tweede, dubbele apiRequest te vuren.
const CACHE_TTL_MS = 2 * 60 * 1000;
const cache = new Map();

function cacheKey(window, vendorAccount, planningDate) {
  const parts = [
    'rccp-analysis-v2',
    vendorAccount,
    window.fromYear, window.fromWeek, window.toYear, window.toWeek,
  ];
  if (planningDate && planningDate !== 'requested') parts.push(planningDate);
  return parts.join('|');
}

function readCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.promise;
}

/**
 * Start (indien nog niet gecached) een achtergrond-fetch van de RCCP-analyse voor deze
 * vendor+window, en cachet de promise zodat een latere "echte" fetch voor dezelfde vendor
 * kan hergebruiken in plaats van opnieuw te fetchen.
 * @param {{ fromYear: number, fromWeek: number, toYear: number, toWeek: number }} window
 * @param {string} vendorAccount
 * @param {string} [planningDate]
 * @returns {Promise|null}
 */
export function prefetchRccpAnalysis(window, vendorAccount, planningDate) {
  if (!vendorAccount || !window) return null;
  const key = cacheKey(window, vendorAccount, planningDate);
  const cached = readCache(key);
  if (cached) return cached;

  const promise = apiRequest(buildAnalysisQuery(window, vendorAccount, planningDate));
  cache.set(key, { promise, expiresAt: Date.now() + CACHE_TTL_MS });
  promise.catch(() => cache.delete(key));
  return promise;
}

/**
 * Leest een eerder gestarte prefetch (in-flight of afgerond) voor deze vendor+window op, zodat
 * useRccpPage geen dubbele apiRequest vuurt wanneer de gebruiker die vendor selecteert.
 * @param {{ fromYear: number, fromWeek: number, toYear: number, toWeek: number }} window
 * @param {string} vendorAccount
 * @param {string} [planningDate]
 * @returns {Promise|null}
 */
export function getCachedRccpAnalysis(window, vendorAccount, planningDate) {
  if (!vendorAccount || !window) return null;
  return readCache(cacheKey(window, vendorAccount, planningDate));
}

/** Alleen voor tests: cache leegmaken tussen scenario's. */
export function clearRccpAnalysisPrefetchCache() {
  cache.clear();
}
