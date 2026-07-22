import { useEffect, useState } from 'react';

/**
 * Gedeelde, gededupliceerde product-image loader.
 *
 * Waarom: bij het uitklappen van subregels mounten er tientallen tot honderden
 * image-cellen tegelijk. Zonder controle vuurt elke cel (thumbnail + tooltip) een
 * eigen request af naar `/api/media/product-image`, waardoor de server-side
 * rate limiter (300/min) 429 teruggeeft en thumbnails verdwijnen ("app hangt").
 *
 * Deze loader lost dat op met drie technieken:
 *  1. Deduplicatie per URL: hetzelfde item over meerdere regels = één request.
 *  2. Concurrency-limiet: maximaal N requests tegelijk (voorkomt de burst).
 *  3. 429-backoff met retry: transient rate-limit hits wachten i.p.v. hard falen.
 *
 * De geladen afbeelding wordt als object-URL gecachet (LRU-begrensd) en gedeeld
 * door thumbnail én tooltip-preview, zodat er per uniek item exact één netwerk-
 * request nodig is.
 *
 * @typedef {'idle'|'loading'|'loaded'|'error'} ProductImageStatus
 * @typedef {{ status: ProductImageStatus, src: string|null }} ProductImageState
 */

const MAX_CONCURRENT = 6;
const MAX_RETRIES = 5;
const CACHE_LIMIT = 400;

/** @type {Map<string, { status: 'loaded'|'error', objectUrl: string|null }>} */
const cache = new Map();
/** @type {Map<string, Promise<{ status: 'loaded'|'error', objectUrl: string|null, retryable: boolean }>>} */
const inflight = new Map();
/** @type {Array<{ url: string, resolve: (entry: { status: 'loaded'|'error', objectUrl: string|null, retryable: boolean }) => void }>} */
const queue = [];
let active = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function remember(url, entry) {
  cache.set(url, { status: entry.status, objectUrl: entry.objectUrl });
  while (cache.size > CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    const old = cache.get(oldestKey);
    if (old && old.objectUrl) URL.revokeObjectURL(old.objectUrl);
    cache.delete(oldestKey);
  }
}

async function fetchImage(url) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response;
    try {
      response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'image/*' } });
    } catch {
      return { status: 'error', objectUrl: null, retryable: true };
    }

    if (response.status === 429) {
      const retryAfterHeader = Number(response.headers.get('retry-after'));
      const wait = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : Math.min(8000, 400 * (2 ** attempt)) + Math.floor(Math.random() * 400);
      await delay(wait);
      continue;
    }

    if (!response.ok) {
      // 204 (geen beeld), 400 (ongeldig) of 502 (tijdelijk stuk) -> geen retry.
      return { status: 'error', objectUrl: null, retryable: false };
    }

    try {
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        return { status: 'error', objectUrl: null, retryable: false };
      }
      return { status: 'loaded', objectUrl: URL.createObjectURL(blob), retryable: false };
    } catch {
      return { status: 'error', objectUrl: null, retryable: true };
    }
  }
  // Retries op 429 uitgeput: niet cachen zodat een latere poging opnieuw mag proberen.
  return { status: 'error', objectUrl: null, retryable: true };
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift();
    active += 1;
    fetchImage(job.url).then((entry) => {
      active -= 1;
      job.resolve(entry);
      pump();
    });
  }
}

function enqueue(url) {
  const cached = cache.get(url);
  if (cached) return Promise.resolve({ ...cached, retryable: false });
  const pending = inflight.get(url);
  if (pending) return pending;

  const promise = new Promise((resolve) => {
    queue.push({ url, resolve });
  }).then((entry) => {
    inflight.delete(url);
    if (!entry.retryable) remember(url, entry);
    return entry;
  });

  inflight.set(url, promise);
  pump();
  return promise;
}

/**
 * Laadt een product-image via de gedeelde loader.
 *
 * @param {string} url - De volledige `/api/media/product-image?...` URL (leeg = geen load).
 * @returns {ProductImageState} status + bruikbare `src` (object-URL) zodra geladen.
 */
export function useProductImage(url) {
  const [state, setState] = useState(() => {
    if (!url) return { status: 'idle', src: null };
    const cached = cache.get(url);
    return cached
      ? { status: cached.status, src: cached.objectUrl }
      : { status: 'loading', src: null };
  });

  useEffect(() => {
    if (!url) {
      setState({ status: 'idle', src: null });
      return undefined;
    }

    const cached = cache.get(url);
    if (cached) {
      setState({ status: cached.status, src: cached.objectUrl });
      return undefined;
    }

    let cancelled = false;
    setState({ status: 'loading', src: null });
    enqueue(url).then((entry) => {
      if (!cancelled) setState({ status: entry.status, src: entry.objectUrl });
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}

export default useProductImage;
