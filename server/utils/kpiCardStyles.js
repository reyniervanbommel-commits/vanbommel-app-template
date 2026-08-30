const KPI_STYLE_KEYS = ['delivered', 'open', 'lateDelivery', 'onTime'];

function thresholdValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(100, Math.max(0, numeric));
}

function normalizeKpiCardStyle(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  return { threshold: thresholdValue(input.threshold) };
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
