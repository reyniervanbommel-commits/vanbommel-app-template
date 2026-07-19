import { getIsoWeekNumber, MONTH_LABELS, parseIsoDate } from '../components/supplier/weekNumberCalendarUtils';

export const DATE_PERIOD_DISPLAY_MODES = {
  week: 'week',
  month: 'month',
};

export function isDatePeriodColumn(column) {
  const dataType = String(column?.dataType || '').trim().toLowerCase();
  if (dataType === 'date_period') return true;
  return Boolean(resolveDatePeriodSourceKey(column)) && dataType !== 'date';
}

export function normalizeDatePeriodDisplayMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return mode === DATE_PERIOD_DISPLAY_MODES.month
    ? DATE_PERIOD_DISPLAY_MODES.month
    : DATE_PERIOD_DISPLAY_MODES.week;
}

export function resolveDatePeriodSourceKey(column) {
  return String(column?.options?.sourceColumnKey || '').trim();
}

/** Parse board/API date values (ISO, ISO datetime, dd/mm/yyyy). */
export function parseDateValueForPeriod(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsedIso = parseIsoDate(value);
  if (parsedIso) return parsedIso;

  if (typeof value === 'string') {
    const trimmed = String(value).trim();
    if (!trimmed) return null;

    const isoDateTimeMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
    if (isoDateTimeMatch) {
      return parseIsoDate(`${isoDateTimeMatch[1]}-${isoDateTimeMatch[2]}-${isoDateTimeMatch[3]}`);
    }

    const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[2]);
      const year = Number(dmyMatch[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day
      ) {
        return date;
      }
    }

    const fallback = new Date(trimmed);
    if (!Number.isNaN(fallback.getTime())) return fallback;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Format a source date value as ISO week number or English month name.
 */
export function formatDatePeriodValue(value, displayMode = DATE_PERIOD_DISPLAY_MODES.week) {
  const mode = normalizeDatePeriodDisplayMode(displayMode);
  const parsed = parseDateValueForPeriod(value);
  if (!parsed) return '';

  if (mode === DATE_PERIOD_DISPLAY_MODES.month) {
    return MONTH_LABELS[parsed.getMonth()] || '';
  }
  return String(getIsoWeekNumber(parsed));
}

export function resolveDatePeriodCellValue(column, rowValues, displayMode) {
  const sourceKey = resolveDatePeriodSourceKey(column);
  if (!sourceKey) return '';
  const sourceValue = rowValues?.[sourceKey];
  return formatDatePeriodValue(sourceValue, displayMode);
}

export function listDateColumns(columns) {
  return (Array.isArray(columns) ? columns : [])
    .filter((column) => String(column?.dataType || '').trim().toLowerCase() === 'date')
    .filter((column) => !isDatePeriodColumn(column));
}

/** Date W/M in week mode shows ISO week numbers and uses numeric sort/filter semantics. */
export function isDatePeriodWeekDisplay(column, datePeriodDisplayModes = {}) {
  if (!isDatePeriodColumn(column)) return false;
  return normalizeDatePeriodDisplayMode(datePeriodDisplayModes[column.key]) === DATE_PERIOD_DISPLAY_MODES.week;
}

export function columnUsesNumberSemantics(column, datePeriodDisplayModes = {}) {
  if (String(column?.dataType || '').trim().toLowerCase() === 'number') return true;
  return isDatePeriodWeekDisplay(column, datePeriodDisplayModes);
}
