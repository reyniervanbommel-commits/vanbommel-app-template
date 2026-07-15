'use strict';

/**
 * RccpSettingsService — RCCP config in dbo.app_settings (#AB:224).
 */

const settingsService = require('./SettingsService');

const CONFIG_KEY = 'RCCP_CONFIG';
const VALID_DUPLICATE_POLICIES = Object.freeze(['update', 'skip']);
const VALID_PERIOD_MODES = Object.freeze(['week', 'month']);

function defaultConfig() {
  return {
    dateColumnKey: 'requestedDeliveryDate',
    quantityColumnKey: 'orderedPurchaseQuantity',
    categoryColumnKey: 'productCategory',
    vendorColumnKey: 'vendorAccount',
    excludedStatuses: ['Canceled', 'Closed'],
    thresholds: { greenMax: 80, orangeMax: 100 },
    duplicatePolicy: 'update',
    periodMode: 'week',
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v || '').trim()).filter(Boolean))];
}

function validateConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, error: 'Config must be an object' };
  }

  const base = defaultConfig();
  const dateColumnKey = String(raw.dateColumnKey ?? base.dateColumnKey).trim();
  const quantityColumnKey = String(raw.quantityColumnKey ?? base.quantityColumnKey).trim();
  const categoryColumnKey = String(raw.categoryColumnKey ?? base.categoryColumnKey).trim();
  const vendorColumnKey = String(raw.vendorColumnKey ?? base.vendorColumnKey).trim();
  if (!dateColumnKey || !quantityColumnKey || !categoryColumnKey || !vendorColumnKey) {
    return { valid: false, error: 'Column keys are required' };
  }

  const excludedStatuses = normalizeStringArray(raw.excludedStatuses ?? base.excludedStatuses);
  const duplicatePolicy = String(raw.duplicatePolicy ?? base.duplicatePolicy);
  if (!VALID_DUPLICATE_POLICIES.includes(duplicatePolicy)) {
    return { valid: false, error: 'duplicatePolicy must be update or skip' };
  }

  const periodMode = String(raw.periodMode ?? base.periodMode);
  if (!VALID_PERIOD_MODES.includes(periodMode)) {
    return { valid: false, error: 'periodMode must be week or month' };
  }

  const thresholdsRaw = raw.thresholds && typeof raw.thresholds === 'object' ? raw.thresholds : base.thresholds;
  const greenMax = Number(thresholdsRaw.greenMax ?? base.thresholds.greenMax);
  const orangeMax = Number(thresholdsRaw.orangeMax ?? base.thresholds.orangeMax);
  if (!Number.isFinite(greenMax) || !Number.isFinite(orangeMax) || greenMax < 0 || orangeMax < greenMax) {
    return { valid: false, error: 'Invalid thresholds' };
  }

  return {
    valid: true,
    config: {
      dateColumnKey,
      quantityColumnKey,
      categoryColumnKey,
      vendorColumnKey,
      excludedStatuses,
      thresholds: { greenMax, orangeMax },
      duplicatePolicy,
      periodMode,
    },
  };
}

async function getConfig() {
  const raw = await settingsService.getAsync(CONFIG_KEY, '');
  if (!raw) return defaultConfig();
  try {
    const parsed = JSON.parse(raw);
    const result = validateConfig(parsed);
    return result.valid ? result.config : defaultConfig();
  } catch {
    return defaultConfig();
  }
}

async function saveConfig(raw, userId = null) {
  const result = validateConfig(raw);
  if (!result.valid) {
    const err = new Error(result.error);
    err.status = 400;
    throw err;
  }
  await settingsService.set(CONFIG_KEY, JSON.stringify(result.config), userId);
  return result.config;
}

module.exports = {
  CONFIG_KEY,
  defaultConfig,
  validateConfig,
  getConfig,
  saveConfig,
};
