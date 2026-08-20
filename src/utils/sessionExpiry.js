export const SESSION_END_REASON = {
  IDLE: 'idle',
  EXPIRED: 'session',
};

let handler = null;
let inflight = false;

/**
 * Registers the callback that signs the user out after a 401 or idle timeout.
 * @param {((reason: string) => void | Promise<void>) | null} fn
 */
export function setSessionExpiredHandler(fn) {
  handler = typeof fn === 'function' ? fn : null;
}

export function notifySessionExpired(reason) {
  if (!handler || inflight) return;
  inflight = true;
  Promise.resolve(handler(reason)).finally(() => {
    inflight = false;
  });
}

export function resetSessionExpiredHandler() {
  handler = null;
  inflight = false;
}

export function isPublicAuthPath(path) {
  const normalized = String(path || '').split('?')[0];
  return normalized === '/auth' || normalized.startsWith('/auth/');
}

export function shouldNotifyUnauthorized(path, status) {
  return status === 401 && !isPublicAuthPath(path);
}

export function getLoginReasonMessage(reason) {
  if (reason === SESSION_END_REASON.IDLE) {
    return 'You were signed out due to inactivity.';
  }
  if (reason === SESSION_END_REASON.EXPIRED) {
    return 'Your session expired. Please sign in again.';
  }
  return '';
}
