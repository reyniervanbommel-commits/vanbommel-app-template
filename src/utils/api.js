import { recordApiTiming } from './perf';
import { notifySessionExpired, SESSION_END_REASON, shouldNotifyUnauthorized } from './sessionExpiry';

// Perf-instrumentatie alleen in dev/preview (niet in productie), zodat we per API-call de duur
// zien in de console én in het DevPerfOverlay. VITE_APP_ENV wordt bij de build gezet.
const PERF_ENABLED =
  import.meta.env.DEV ||
  import.meta.env.VITE_APP_ENV === 'dev' ||
  import.meta.env.VITE_APP_ENV === 'preview';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export async function apiRequest(path, options) {
  const opts = options || {};
  const method = opts.method || 'GET';
  const started = now();
  let status = 0;
  try {
    const res = await fetch('/api' + path, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      method,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    status = res.status;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (shouldNotifyUnauthorized(path, res.status)) {
        notifySessionExpired(SESSION_END_REASON.EXPIRED);
      }
      const message = data.error || (res.status === 503 ? 'Service unavailable' : 'Request failed');
      throw Object.assign(new Error(message), { status: res.status, data });
    }
    return data;
  } finally {
    if (PERF_ENABLED) {
      const ms = Math.round(now() - started);
      recordApiTiming({ method, path, status, ms, at: Date.now() });
      // eslint-disable-next-line no-console
      console.debug(`[api] ${method} ${path} → ${status} in ${ms}ms`);
    }
  }
}
