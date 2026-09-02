'use strict';

const DATE_PERIOD_DISPLAY_MODES = {
  week: 'week',
  month: 'month',
};

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizeDatePeriodDisplayMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return mode === DATE_PERIOD_DISPLAY_MODES.month
    ? DATE_PERIOD_DISPLAY_MODES.month
    : DATE_PERIOD_DISPLAY_MODES.week;
}

function isDateLikeColumnType(dataType) {
  const normalized = String(dataType || '').trim().toLowerCase();
  return normalized === 'date' || normalized === 'datetime' || normalized === 'date-time';
}

function columnNameLooksLikeDate(column) {
  return /date|datum/i.test(`${column?.key || ''} ${column?.label || ''}`);
}

/**
 * Date W/M may use a native date column, or a push-to-header rollup whose
 * line source is a date (those headers are stored as text).
 */
function isAllowedDatePeriodSource({ sourceDataType, linkedLineColumn = null } = {}) {
  if (isDateLikeColumnType(sourceDataType)) return true;
  if (!linkedLineColumn) return false;
  if (isDateLikeColumnType(linkedLineColumn.dataType)) return true;
  return columnNameLooksLikeDate(linkedLineColumn);
}

function validateDatePeriodOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw badRequest('Date period options must be an object');
  }
  const sourceColumnKey = String(options.sourceColumnKey || '').trim();
  if (!sourceColumnKey) {
    throw badRequest('sourceColumnKey is required');
  }
  const displayMode = options.displayMode === undefined
    ? DATE_PERIOD_DISPLAY_MODES.week
    : normalizeDatePeriodDisplayMode(options.displayMode);
  return {
    sourceColumnKey,
    displayMode,
  };
}

module.exports = {
  DATE_PERIOD_DISPLAY_MODES,
  normalizeDatePeriodDisplayMode,
  validateDatePeriodOptions,
  isDateLikeColumnType,
  isAllowedDatePeriodSource,
};
