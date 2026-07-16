/** In-memory sync bus so Admin RCCP tab and RCCP flyout stay aligned after saves. */
let cachedConfig = null;
const listeners = new Set();

export function getCachedRccpConfig() {
  return cachedConfig;
}

export function publishRccpSettingsSync(config) {
  cachedConfig = config;
  listeners.forEach((listener) => listener(config));
}

export function subscribeRccpSettingsSync(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
