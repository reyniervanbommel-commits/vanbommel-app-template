'use strict';

/** Standaard frontend-origin voor lokale ontwikkeling (Vite). */
const DEFAULT_LOCAL_APP_ORIGIN = 'http://localhost:5178';

/**
 * Bepaalt de applicatie-omgeving onafhankelijk van NODE_ENV.
 * Container-DEV draait NODE_ENV=production maar gedraagt zich als dev-omgeving.
 */
function getAppEnv() {
  const explicit = String(process.env.APP_ENV || '').trim().toLowerCase();
  if (explicit) return explicit;
  return process.env.NODE_ENV === 'production' ? 'production' : 'dev';
}

function isDevLikeApp() {
  const env = getAppEnv();
  return env === 'dev' || env === 'preview' || env === 'development';
}

function isProductionApp() {
  return getAppEnv() === 'production';
}

function getAppBaseUrl() {
  return String(process.env.APP_BASE_URL || DEFAULT_LOCAL_APP_ORIGIN).trim() || DEFAULT_LOCAL_APP_ORIGIN;
}

function useSecureSessionCookies() {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return getAppBaseUrl().startsWith('https://');
}

module.exports = {
  DEFAULT_LOCAL_APP_ORIGIN,
  getAppEnv,
  getAppBaseUrl,
  isDevLikeApp,
  isProductionApp,
  useSecureSessionCookies,
};
