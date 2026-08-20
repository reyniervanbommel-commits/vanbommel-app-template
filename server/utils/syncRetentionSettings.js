'use strict';

const settingsService = require('../services/SettingsService');

const DEFAULTS = {
  PO_SYNC_RETAINED_MAX_AUTO: 2000,
  PO_SYNC_RETAINED_FETCH_BUDGET: 2000,
  PO_SYNC_RETAINED_WARN_AT: 800,
  PO_SYNC_RETAINED_CRITICAL_AT: 1800,
};

const RETAINED_PO_CHUNK_SIZE = 20;
const RETAINED_MAX_LIMIT = 10000;

function clampRetainedMax(raw) {
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULTS.PO_SYNC_RETAINED_MAX_AUTO;
  return Math.min(RETAINED_MAX_LIMIT, parsed);
}

function deriveRetentionCompanionSettings(maxAuto) {
  const capped = clampRetainedMax(maxAuto);
  const warnAt = Math.max(1, Math.round(capped * 0.4));
  const criticalAt = Math.min(capped, Math.max(warnAt, Math.round(capped * 0.9)));
  return {
    maxAuto: capped,
    fetchBudget: capped,
    warnAt,
    criticalAt,
  };
}

function expandRetentionSettings(settings) {
  if (!settings || !Object.prototype.hasOwnProperty.call(settings, 'PO_SYNC_RETAINED_MAX_AUTO')) {
    return settings;
  }
  const derived = deriveRetentionCompanionSettings(settings.PO_SYNC_RETAINED_MAX_AUTO);
  return {
    ...settings,
    PO_SYNC_RETAINED_MAX_AUTO: String(derived.maxAuto),
    PO_SYNC_RETAINED_FETCH_BUDGET: String(derived.fetchBudget),
    PO_SYNC_RETAINED_WARN_AT: String(derived.warnAt),
    PO_SYNC_RETAINED_CRITICAL_AT: String(derived.criticalAt),
  };
}

async function getPositiveIntSetting(key, fallback) {
  const raw = await settingsService.getAsync(key, String(fallback));
  const parsed = Number.parseInt(String(raw || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

async function getSyncRetentionSettings() {
  const maxAuto = await getPositiveIntSetting(
    'PO_SYNC_RETAINED_MAX_AUTO',
    DEFAULTS.PO_SYNC_RETAINED_MAX_AUTO
  );
  const derived = deriveRetentionCompanionSettings(maxAuto);
  return {
    ...derived,
    chunkSize: RETAINED_PO_CHUNK_SIZE,
  };
}

function resolveRetentionWarning(retainedCount, settings, { capReached = false } = {}) {
  if (capReached) return 'cap';
  const count = Number(retainedCount) || 0;
  if (count >= settings.criticalAt) return 'critical';
  if (count >= settings.warnAt) return 'approaching';
  return 'none';
}

module.exports = {
  DEFAULTS,
  RETAINED_PO_CHUNK_SIZE,
  RETAINED_MAX_LIMIT,
  clampRetainedMax,
  deriveRetentionCompanionSettings,
  expandRetentionSettings,
  getSyncRetentionSettings,
  resolveRetentionWarning,
};
