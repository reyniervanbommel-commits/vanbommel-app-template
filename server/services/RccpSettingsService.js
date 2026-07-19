'use strict';

/**
 * RccpSettingsService — RCCP config in dbo.app_settings (#AB:224).
 */

const settingsService = require('./SettingsService');
const registry = require('./TableRegistryService');

const CONFIG_KEY = 'RCCP_CONFIG';
const PO_TABLE_KEY = 'purchase-orders';
const VALID_DUPLICATE_POLICIES = Object.freeze(['update', 'skip']);
const VALID_PERIOD_MODES = Object.freeze(['week', 'month']);
const VALID_CHART_TYPES = Object.freeze(['line', 'bar']);
const MEASURE_COLORS = Object.freeze(['#D13438', '#0078D4', '#8764B8', '#CA5010', '#107C10', '#5C2D91']);
const CAPACITY_MEASURE_KEY = '__capacity__';

function defaultQuantityMeasures() {
  return [{
    columnKey: 'quantity',
    label: 'Quantity',
    chartType: 'line',
    color: '#D13438',
    showInChart: true,
  }];
}

function defaultConfig() {
  return {
    dateColumnKey: 'requestedDeliveryDate',
    vendorColumnKey: 'vendorAccount',
    quantityMeasures: defaultQuantityMeasures(),
    excludedStatuses: ['Canceled', 'Closed'],
    thresholds: { greenMax: 80, orangeMax: 100 },
    duplicatePolicy: 'update',
    periodMode: 'week',
  };
}

const LEGACY_COLUMN_KEY_MAP = Object.freeze({
  orderedPurchaseQuantity: 'quantity',
});

function normalizeQuantityMeasures(raw) {
  const list = Array.isArray(raw?.quantityMeasures) ? raw.quantityMeasures : [];
  if (list.length) {
    return list.map((entry, index) => {
      const columnKey = String(entry?.columnKey || '').trim();
      if (!columnKey) return null;
      const chartType = VALID_CHART_TYPES.includes(entry?.chartType) ? entry.chartType : 'line';
      const color = /^#[0-9a-fA-F]{6}$/.test(String(entry?.color || ''))
        ? String(entry.color)
        : MEASURE_COLORS[index % MEASURE_COLORS.length];
      return {
        columnKey,
        label: String(entry?.label || columnKey).trim() || columnKey,
        chartType,
        color,
        showInChart: entry?.showInChart !== false,
      };
    }).filter(Boolean).slice(0, 8);
  }

  const legacyKey = String(raw?.quantityColumnKey || 'quantity').trim();
  const mapped = LEGACY_COLUMN_KEY_MAP[legacyKey] || legacyKey;
  return [{
    columnKey: mapped,
    label: mapped,
    chartType: 'line',
    color: MEASURE_COLORS[0],
    showInChart: true,
  }];
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
  const vendorColumnKey = String(raw.vendorColumnKey ?? base.vendorColumnKey).trim();
  const quantityMeasures = normalizeQuantityMeasures(raw);
  if (!dateColumnKey || !vendorColumnKey || !quantityMeasures.length) {
    return { valid: false, error: 'Column keys and at least one quantity measure are required' };
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
      vendorColumnKey,
      quantityMeasures,
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
    if (!result.valid) return defaultConfig();
    return result.config;
  } catch {
    return defaultConfig();
  }
}

/**
 * Alleen kolommen die de admin op de data model-tab heeft vrijgegeven mogen als waardekolom
 * dienen. Deze check zit bewust in het schrijfpad: getConfig() draait bij elke analyse en moet
 * geen database-lookup doen.
 */
async function assertMeasuresAreReleased(measures) {
  const table = await registry.getTableByKey(PO_TABLE_KEY);
  const columns = await registry.listColumns({ tableId: table.id });
  const released = new Set(columns.filter((c) => c.rccpMeasure).map((c) => c.key));
  const rejected = (measures || [])
    .map((m) => m.columnKey)
    .filter((key) => !released.has(key));
  if (rejected.length) {
    const err = new Error(
      `Not released as an RCCP value column: ${[...new Set(rejected)].join(', ')}. `
      + 'Enable it under Admin → Data model first.',
    );
    err.status = 400;
    throw err;
  }
}

async function saveConfig(raw, userId = null) {
  const result = validateConfig(raw);
  if (!result.valid) {
    const err = new Error(result.error);
    err.status = 400;
    throw err;
  }
  await assertMeasuresAreReleased(result.config.quantityMeasures);
  await settingsService.set(CONFIG_KEY, JSON.stringify(result.config), userId);
  return result.config;
}

module.exports = {
  CONFIG_KEY,
  CAPACITY_MEASURE_KEY,
  defaultConfig,
  normalizeQuantityMeasures,
  validateConfig,
  getConfig,
  saveConfig,
};
