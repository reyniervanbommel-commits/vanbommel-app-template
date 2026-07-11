'use strict';

const settingsService = require('../services/SettingsService');

const DEFAULTS = {
  PO_SYNC_RETAINED_MAX_AUTO: 500,
  PO_SYNC_RETAINED_FETCH_BUDGET: 500,
  PO_SYNC_RETAINED_WARN_AT: 200,
  PO_SYNC_RETAINED_CRITICAL_AT: 500,
};

const RETAINED_PO_CHUNK_SIZE = 20;

async function getPositiveIntSetting(key, fallback) {
  const raw = await settingsService.getAsync(key, String(fallback));
  const parsed = Number.parseInt(String(raw || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

async function getSyncRetentionSettings() {
  const [
    maxAuto,
    fetchBudget,
    warnAt,
    criticalAt,
  ] = await Promise.all([
    getPositiveIntSetting('PO_SYNC_RETAINED_MAX_AUTO', DEFAULTS.PO_SYNC_RETAINED_MAX_AUTO),
    getPositiveIntSetting('PO_SYNC_RETAINED_FETCH_BUDGET', DEFAULTS.PO_SYNC_RETAINED_FETCH_BUDGET),
    getPositiveIntSetting('PO_SYNC_RETAINED_WARN_AT', DEFAULTS.PO_SYNC_RETAINED_WARN_AT),
    getPositiveIntSetting('PO_SYNC_RETAINED_CRITICAL_AT', DEFAULTS.PO_SYNC_RETAINED_CRITICAL_AT),
  ]);
  return {
    maxAuto,
    fetchBudget,
    warnAt,
    criticalAt,
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
  getSyncRetentionSettings,
  resolveRetentionWarning,
};
