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

function normalizeColumnDataType(column) {
  return String(column?.dataType || '').trim().toLowerCase();
}

function columnDataTypeIsDate(column) {
  const dataType = normalizeColumnDataType(column);
  return dataType === 'date' || dataType === 'datetime' || dataType === 'date-time';
}

function columnNameLooksLikeDate(column) {
  return /date|datum/i.test(`${column?.key || ''} ${column?.label || ''}`);
}

function findLineValueLink(headerColumnKey, lineValueHeaderLinks) {
  const headerKey = String(headerColumnKey || '').trim();
  if (!headerKey || !Array.isArray(lineValueHeaderLinks)) return null;
  return lineValueHeaderLinks.find((link) => String(link?.headerColumnKey || '').trim() === headerKey) || null;
}

/**
 * True when a header column can be used as the Date W/M source.
 * Includes native date columns and "Push values to header" columns whose line
 * source is a date (those headers are stored as text).
 */
export function isDateSourceColumn(column, { lineColumns = [], lineValueHeaderLinks = [] } = {}) {
  if (!column || isDatePeriodColumn(column)) return false;
  if (columnDataTypeIsDate(column)) return true;

  const dataType = normalizeColumnDataType(column);
  if (dataType && dataType !== 'text') return false;

  const link = findLineValueLink(column.key, lineValueHeaderLinks);
  if (link) {
    const lineColumn = (Array.isArray(lineColumns) ? lineColumns : [])
      .find((entry) => entry?.key === link.lineColumnKey);
    if (lineColumn && (columnDataTypeIsDate(lineColumn) || columnNameLooksLikeDate(lineColumn))) {
      return true;
    }
  }
  return columnNameLooksLikeDate(column);
}

function firstNonEmptyValue(values) {
  if (!Array.isArray(values)) return null;
  return values.find((value) => value != null && value !== '') ?? null;
}

function pickDatePeriodSourceValue(sourceKey, rowValues, linkedLineValues) {
  const firstLinked = firstNonEmptyValue(linkedLineValues?.[sourceKey]);
  if (firstLinked != null) return firstLinked;

  const sourceValue = rowValues?.[sourceKey];
  if (typeof sourceValue === 'string' && sourceValue.includes(',')) {
    const firstPart = sourceValue.split(',')[0].trim();
    if (firstPart) return firstPart;
  }
  return sourceValue;
}

export function resolveDatePeriodCellValue(column, rowValues, displayMode, linkedLineValues) {
  const sourceKey = resolveDatePeriodSourceKey(column);
  if (!sourceKey) return '';
  const sourceValue = pickDatePeriodSourceValue(sourceKey, rowValues, linkedLineValues);
  return formatDatePeriodValue(sourceValue, displayMode);
}

export function listDateColumns(columns, context = {}) {
  return (Array.isArray(columns) ? columns : [])
    .filter((column) => isDateSourceColumn(column, context));
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
