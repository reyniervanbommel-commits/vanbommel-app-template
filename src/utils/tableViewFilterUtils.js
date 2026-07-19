// Pure filter-/operator-helpers voor de PO-tabel én de BI-builder.
// Geen React/side effects, dus los unit-testbaar. De semantiek is bewust identiek aan de
// server-side aggregatie (server/utils/biAggregate.js) zodat een filter in de tabel exact
// hetzelfde resultaat geeft als in een grafiek (#AB:220).

import { columnUsesNumberSemantics } from './datePeriodColumnUtils';

export const TEXT_FILTER_OPERATORS = {
  equals: 'is exactly',
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  notStartsWith: 'does not start with',
  oneOf: 'is one of',
};

export const DATE_FILTER_OPERATORS = {
  equals: 'is exactly',
  before: 'is before',
  after: 'is after',
  between: 'is between',
  inNextWeeks: 'is in the next xx weeks',
  inNextDays: 'is in the next xx days',
  nextWeek: 'is next week',
};

export const NUMBER_FILTER_OPERATORS = {
  equals: 'is exactly',
  gt: 'is greater than',
  lt: 'is less than',
  gte: 'is greater than or equal to',
  lte: 'is less than or equal to',
  between: 'is between',
};

export function isDateColumn(column) {
  return column?.dataType === 'date';
}

export function isNumberColumn(column) {
  return column?.dataType === 'number';
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function parseOneOfValues(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function parseNumberValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function startOfNextWeek() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = ((8 - day) % 7) || 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMonday).getTime();
}

// Bepaalt het standaard filter-model voor een kolomtype.
export function resolveFilterModel(column, filter, datePeriodDisplayModes = {}) {
  if (isDateColumn(column)) {
    return {
      operator: filter?.operator || 'before',
      value: filter?.value || '',
      secondaryValue: filter?.secondaryValue || '',
    };
  }
  if (columnUsesNumberSemantics(column, datePeriodDisplayModes)) {
    return {
      operator: filter?.operator || 'equals',
      value: filter?.value || '',
      secondaryValue: filter?.secondaryValue || '',
    };
  }
  return {
    operator: filter?.operator || 'contains',
    value: filter?.value || '',
    secondaryValue: '',
  };
}

export function hasActiveFilter(column, filter, datePeriodDisplayModes = {}) {
  if (!filter) return false;
  if (isDateColumn(column)) {
    if (filter.operator === 'nextWeek') return true;
    if (filter.operator === 'between') return Boolean(filter.value && filter.secondaryValue);
    if (filter.operator === 'equals' && filter.value === '') return true;
    return Boolean(filter.value);
  }
  if (columnUsesNumberSemantics(column, datePeriodDisplayModes)) {
    if (filter.operator === 'between') return Boolean(filter.value !== '' && filter.secondaryValue !== '');
    return filter.value !== '' && filter.value !== null && filter.value !== undefined;
  }
  if (filter.operator === 'equals' && filter.value === '') return true;
  return Boolean(filter.value);
}

export function dateMatchesFilter(rawValue, filter) {
  const rowTime = parseDateValue(rawValue);
  if (rowTime === null) return false;
  if (filter.operator === 'before') {
    const target = parseDateValue(filter.value);
    return target !== null ? rowTime < target : true;
  }
  if (filter.operator === 'after') {
    const target = parseDateValue(filter.value);
    return target !== null ? rowTime > target : true;
  }
  if (filter.operator === 'between') {
    const from = parseDateValue(filter.value);
    const to = parseDateValue(filter.secondaryValue);
    if (from === null || to === null) return true;
    return rowTime >= Math.min(from, to) && rowTime <= Math.max(from, to);
  }
  if (filter.operator === 'inNextWeeks') {
    const count = Number(filter.value);
    if (!Number.isFinite(count) || count <= 0) return true;
    const start = startOfToday();
    return rowTime >= start && rowTime <= start + (count * 7 * 24 * 60 * 60 * 1000);
  }
  if (filter.operator === 'inNextDays') {
    const count = Number(filter.value);
    if (!Number.isFinite(count) || count <= 0) return true;
    const start = startOfToday();
    return rowTime >= start && rowTime <= start + (count * 24 * 60 * 60 * 1000);
  }
  if (filter.operator === 'nextWeek') {
    const weekStart = startOfNextWeek();
    return rowTime >= weekStart && rowTime < weekStart + (7 * 24 * 60 * 60 * 1000);
  }
  if (filter.operator === 'equals') {
    const target = parseDateValue(filter.value);
    if (target === null) return false;
    const a = new Date(rowTime);
    const b = new Date(target);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  return true;
}

export function textMatchesFilter(rawValue, filter) {
  const normalized = normalizeText(rawValue);
  const query = normalizeText(filter.value);
  if (!query && filter.operator !== 'oneOf' && filter.operator !== 'equals') return true;
  if (filter.operator === 'equals') return normalized === query;
  if (filter.operator === 'contains') return normalized.includes(query);
  if (filter.operator === 'notContains') return !normalized.includes(query);
  if (filter.operator === 'startsWith') return normalized.startsWith(query);
  if (filter.operator === 'notStartsWith') return !normalized.startsWith(query);
  if (filter.operator === 'oneOf') {
    const options = parseOneOfValues(filter.value);
    return options.length ? options.includes(normalized) : true;
  }
  return true;
}

export function numberMatchesFilter(rawValue, filter) {
  if (filter.operator === 'between') {
    const from = parseNumberValue(filter.value);
    const to = parseNumberValue(filter.secondaryValue);
    if (from === null || to === null) return true;
    const rowNum = parseNumberValue(rawValue);
    if (rowNum === null) return false;
    return rowNum >= Math.min(from, to) && rowNum <= Math.max(from, to);
  }
  const target = parseNumberValue(filter.value);
  if (target === null) return true;
  const rowNum = parseNumberValue(rawValue);
  if (rowNum === null) return false;
  if (filter.operator === 'equals') return rowNum === target;
  if (filter.operator === 'gt') return rowNum > target;
  if (filter.operator === 'lt') return rowNum < target;
  if (filter.operator === 'gte') return rowNum >= target;
  if (filter.operator === 'lte') return rowNum <= target;
  return true;
}

// Dispatcht op kolomtype naar de juiste match-functie.
export function columnValueMatchesFilter(column, rawValue, filter, datePeriodDisplayModes = {}) {
  if (isDateColumn(column)) return dateMatchesFilter(rawValue, filter);
  if (columnUsesNumberSemantics(column, datePeriodDisplayModes)) return numberMatchesFilter(rawValue, filter);
  return textMatchesFilter(rawValue, filter);
}

/**
 * Zet een ruwe celwaarde om naar de filterwaarde die in filterByColumn wordt opgeslagen.
 */
export function serializeRawValueForFilter(column, rawValue) {
  if (rawValue === null || rawValue === undefined) return '';
  if (isDateColumn(column)) {
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return String(rawValue);
    return `${parsed.getFullYear()}-${padDatePart(parsed.getMonth() + 1)}-${padDatePart(parsed.getDate())}`;
  }
  return String(rawValue);
}

/**
 * Bouwt een equals-filter op basis van de ruwe celwaarde.
 */
export function buildFilterFromCellValue(column, rawValue) {
  return {
    operator: 'equals',
    value: serializeRawValueForFilter(column, rawValue),
    secondaryValue: '',
  };
}

/**
 * Bepaalt of het contextmenu op een cel uitgeschakeld moet zijn.
 */
export function isCellContextMenuDisabled(column) {
  if (!column?.key) return true;
  return false;
}

/**
 * Kopieert een celwaarde naar het klembord.
 */
export async function copyCellValueToClipboard(column, rawValue) {
  const text = serializeRawValueForFilter(column, rawValue);
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
}
