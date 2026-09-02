'use strict';

function normalizeComparableValue(value, { dateOnly = false } = {}) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return `bool:${value ? '1' : '0'}`;
  if (typeof value === 'number') return Number.isFinite(value) ? `num:${value}` : 'num:NaN';

  const str = String(value).trim();
  if (!str) return '';

  const isoLike = str.match(
    /^(\d{4}-\d{2}-\d{2})(?:[Tt ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/
  );
  if (isoLike) {
    const datePart = isoLike[1];
    if (dateOnly) return `date:${datePart}`;
    const hh = isoLike[2];
    if (!hh) return `date:${datePart}`;
    const mm = isoLike[3];
    const ss = isoLike[4] || '00';
    return `datetime:${datePart}T${hh}:${mm}:${ss}`;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (Number.isFinite(num)) return `num:${num}`;
  }

  return `text:${str}`;
}

function valuesEqualForConcurrency(currentValue, basedOnValue, dataType) {
  const dateOnly = String(dataType || '').toLowerCase() === 'date';
  return normalizeComparableValue(currentValue, { dateOnly })
    === normalizeComparableValue(basedOnValue, { dateOnly });
}

module.exports = {
  normalizeComparableValue,
  valuesEqualForConcurrency,
};
