const { HEX_COLOR_PATTERN } = require('./hexColor');

const KPI_STYLE_KEYS = ['delivered', 'open', 'lateDelivery', 'onTime'];
const KPI_COLOR_TARGET_VALUE = 'value';
const KPI_COLOR_TARGET_OTHER = 'other';

function colorValue(value) {
  return HEX_COLOR_PATTERN.test(String(value || '')) ? String(value).toLowerCase() : null;
}

function colorTargetValue(value) {
  return value === KPI_COLOR_TARGET_OTHER ? KPI_COLOR_TARGET_OTHER : KPI_COLOR_TARGET_VALUE;
}

function normalizeKpiCardStyle(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  return {
    color: colorValue(input.color),
    colorTarget: colorTargetValue(input.colorTarget),
  };
}

function normalizeKpiCardStyles(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const next = {};
  KPI_STYLE_KEYS.forEach((key) => {
    next[key] = normalizeKpiCardStyle(input[key]);
  });
  return next;
}

module.exports = { normalizeKpiCardStyles, KPI_STYLE_KEYS };
