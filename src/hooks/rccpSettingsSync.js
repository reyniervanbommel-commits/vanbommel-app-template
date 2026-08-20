/** In-memory sync bus so RCCP flyout instances stay aligned after saves. */
let cachedConfig = null;
const listeners = new Set();
const savedListeners = new Set();

export function getCachedRccpConfig() {
  return cachedConfig;
}

export function publishRccpSettingsSync(config) {
  cachedConfig = config;
  listeners.forEach((listener) => listener(config));
}

/** Same as sync, plus notifies analysis views to refresh the chart immediately. */
export function publishRccpSettingsSaved(config) {
  publishRccpSettingsSync(config);
  savedListeners.forEach((listener) => listener(config));
}

export function subscribeRccpSettingsSync(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeRccpSettingsSaved(listener) {
  savedListeners.add(listener);
  return () => savedListeners.delete(listener);
}
