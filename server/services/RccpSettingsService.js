'use strict';

/**
 * RccpSettingsService — RCCP config in dbo.app_settings (#AB:224).
 */

const settingsService = require('./SettingsService');
const dataService = require('./TableDataService');
const { isHexColor } = require('../utils/hexColor');

const CONFIG_KEY = 'RCCP_CONFIG';
const PO_TABLE_KEY = 'purchase-orders';
const VALID_DUPLICATE_POLICIES = Object.freeze(['update', 'skip']);
const VALID_PERIOD_MODES = Object.freeze(['week', 'month']);
const VALID_CHART_TYPES = Object.freeze(['line', 'bar']);
const MEASURE_COLORS = Object.freeze(['#D13438', '#0078D4', '#8764B8', '#CA5010', '#107C10', '#5C2D91']);
const CAPACITY_MEASURE_KEY = '__capacity__';
// Synthetische measure-sleutel voor de "overcapaciteit"-regel (capaciteit min de openstaande
// measure). Geen tb_columns-kolom; alleen een afgeleide matrix/chart-regel.
const OVERCAPACITY_MEASURE_KEY = '__overcapacity__';
// Synthetische measure-sleutel voor de waarschuwingsdrempel (greenMax % van capaciteit).
// Getoond als gestippelde lijn in de grafiek; niet zichtbaar in de matrix.
const WARNING_MEASURE_KEY = '__warning__';

function defaultQuantityMeasures() {
  return [{
    columnKey: 'quantity',
    label: 'Quantity',
    chartType: 'line',
    color: '#D13438',
    showInChart: true,
  }];
}

function normalizeChartWeekRanges(raw) {
  const list = Array.isArray(raw?.chartWeekRanges) ? raw.chartWeekRanges : [];
  return list.map((entry, index) => {
    const fromYear = Number(entry?.fromYear);
    const fromWeek = Number(entry?.fromWeek);
    const toYear = Number(entry?.toYear);
    const toWeek = Number(entry?.toWeek);
    if (!Number.isFinite(fromYear) || !Number.isFinite(fromWeek)
      || !Number.isFinite(toYear) || !Number.isFinite(toWeek)) return null;
    if (fromWeek < 1 || fromWeek > 53 || toWeek < 1 || toWeek > 53) return null;
    if (fromYear * 100 + fromWeek > toYear * 100 + toWeek) return null;
    const color = isHexColor(entry?.color)
      ? String(entry.color).toLowerCase()
      : MEASURE_COLORS[index % MEASURE_COLORS.length];
    const label = String(entry?.label || '').trim();
    return {
      fromYear,
      fromWeek,
      toYear,
      toWeek,
      color,
      ...(label ? { label } : {}),
    };
  }).filter(Boolean).slice(0, 12);
}

function defaultConfig() {
  return {
    dateColumnKey: 'requestedDeliveryDate',
    receiptDateColumnKey: '',
    confirmedDateColumnKey: '',
    vendorColumnKey: 'vendorAccount',
    quantityMeasures: defaultQuantityMeasures(),
    openMeasureKey: '',
    deliveredMeasureKey: '',
    remainingMeasureKey: '',
    showCapacityLine: true,
    showWarningLine: true,
    chartWeekRanges: [],
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
      const color = isHexColor(entry?.color)
        ? String(entry.color).toLowerCase()
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
  const receiptDateColumnKey = String(raw.receiptDateColumnKey ?? '').trim();
  if (receiptDateColumnKey.length > 128) {
    return { valid: false, error: 'receiptDateColumnKey must be at most 128 characters' };
  }
  if (receiptDateColumnKey && !/^[A-Za-z0-9_]+$/.test(receiptDateColumnKey)) {
    return { valid: false, error: 'receiptDateColumnKey may only contain letters, numbers and underscores' };
  }
  const confirmedDateColumnKey = String(raw.confirmedDateColumnKey ?? '').trim();
  if (confirmedDateColumnKey.length > 128) {
    return { valid: false, error: 'confirmedDateColumnKey must be at most 128 characters' };
  }
  if (confirmedDateColumnKey && !/^[A-Za-z0-9_]+$/.test(confirmedDateColumnKey)) {
    return { valid: false, error: 'confirmedDateColumnKey may only contain letters, numbers and underscores' };
  }
  const vendorColumnKey = String(raw.vendorColumnKey ?? base.vendorColumnKey).trim();
  const quantityMeasures = normalizeQuantityMeasures(raw);
  if (!dateColumnKey || !vendorColumnKey || !quantityMeasures.length) {
    return { valid: false, error: 'Column keys and at least one quantity measure are required' };
  }

  // Welke measure als "openstaand" van de capaciteit wordt afgetrokken. Leeg = uit. Alleen geldig
  // als hij naar een van de gekozen measures wijst; anders stil terug naar uit, zodat een
  // verwijderde measure de config niet ongeldig maakt.
  const openMeasureKeyRaw = String(raw.openMeasureKey ?? '').trim();
  const openMeasureKey = quantityMeasures.some((m) => m.columnKey === openMeasureKeyRaw)
    ? openMeasureKeyRaw
    : '';

  // Delivered measure: waarden worden negatief getoond (onder de x-as).
  const deliveredMeasureKeyRaw = String(raw.deliveredMeasureKey ?? '').trim();
  const deliveredMeasureKey = quantityMeasures.some((m) => m.columnKey === deliveredMeasureKeyRaw)
    ? deliveredMeasureKeyRaw : '';

  // Remaining measure: getoond als positieve balk (boven de x-as), aparte kleur.
  const remainingMeasureKeyRaw = String(raw.remainingMeasureKey ?? '').trim();
  const remainingMeasureKey = quantityMeasures.some((m) => m.columnKey === remainingMeasureKeyRaw)
    ? remainingMeasureKeyRaw : '';

  const showCapacityLine = raw.showCapacityLine !== false;
  const showWarningLine = raw.showWarningLine !== false;

  const chartWeekRanges = normalizeChartWeekRanges(raw);
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
      receiptDateColumnKey,
      confirmedDateColumnKey,
      vendorColumnKey,
      quantityMeasures,
      openMeasureKey,
      deliveredMeasureKey,
      remainingMeasureKey,
      showCapacityLine,
      showWarningLine,
      chartWeekRanges,
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
 *
 * We lezen via getBoardColumnDefinitions in plaats van registry.listColumns, zodat lookup-kolommen
 * (bv. Received qty uit de ontvangstregels) meetellen. Die staan niet in tb_columns van deze tabel;
 * ze erven hun vrijgave van de doelkolom. Dat is dezelfde kolomlijst die de analyse gebruikt, dus
 * wat hier valideert, kan de aggregatie ook echt resolven.
 */
async function assertMeasuresAreReleased(measures) {
  const defs = await dataService.getBoardColumnDefinitions(PO_TABLE_KEY);
  const columns = [...(defs.master || []), ...(defs.detail || [])];
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
  OVERCAPACITY_MEASURE_KEY,
  WARNING_MEASURE_KEY,
  defaultConfig,
  normalizeQuantityMeasures,
  normalizeChartWeekRanges,
  validateConfig,
  getConfig,
  saveConfig,
};
