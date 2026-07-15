// Hulpfuncties voor het netjes weergeven van purchase-order celwaarden en
// de versheidsindicator. Gehouden in een aparte util zodat tabel en pagina
// dezelfde formattering delen.

const NL_DATETIME = new Intl.DateTimeFormat('nl-NL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const NL_NUMBER = new Intl.NumberFormat('nl-NL');

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function formatAsDdMmYyyyFromDate(date) {
  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function tryFormatAsDdMmYyyy(value) {
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return formatAsDdMmYyyyFromDate(value);
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // ISO datums (yyyy-mm-dd of yyyy-mm-ddThh:mm:ss) mappen direct, zonder locale variatie.
    const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (isoDateMatch) {
      const [, year, month, day] = isoDateMatch;
      return `${day}/${month}/${year}`;
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatAsDdMmYyyyFromDate(parsed);
}

function isDateType(dataType) {
  const normalized = String(dataType || '').trim().toLowerCase();
  return normalized === 'date' || normalized === 'datetime' || normalized === 'date-time';
}

function isLikelyDateColumn(columnKey, columnLabel) {
  const keyText = String(columnKey || '');
  const labelText = String(columnLabel || '');
  return /date|datum|aangemaakt|created|delivery|ship/i.test(`${keyText} ${labelText}`);
}

function looksLikeIsoDateString(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.test(trimmed);
}

/**
 * Formatteert een readonly D365-celwaarde op basis van het dataType.
 * Custom kolommen worden elders inline bewerkbaar gerenderd.
 */
export function formatCellValue(value, dataType, columnMeta = '') {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const resolvedColumnKey = typeof columnMeta === 'string' ? columnMeta : columnMeta?.columnKey || '';
  const resolvedColumnLabel = typeof columnMeta === 'string' ? '' : columnMeta?.columnLabel || '';
  const normalizedDate = tryFormatAsDdMmYyyy(value);
  const normalizedDataType = String(dataType || '').trim().toLowerCase();
  if (
    isDateType(dataType)
    || (normalizedDataType !== 'date_period'
      && isLikelyDateColumn(resolvedColumnKey, resolvedColumnLabel)
      && normalizedDate)
    || (normalizedDataType !== 'date_period' && looksLikeIsoDateString(value) && normalizedDate)
  ) {
    return normalizedDate || String(value);
  }

  if (dataType === 'number') {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isNaN(num)) {
      return NL_NUMBER.format(num);
    }
    return String(value);
  }

  if (dataType === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

/**
 * Geeft een Nederlandse, relatieve "laatst ververst"-tekst terug.
 */
export function formatSyncedAt(syncedAt) {
  if (!syncedAt) return null;
  const parsed = new Date(syncedAt);
  if (Number.isNaN(parsed.getTime())) return null;

  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hours ago`;
  return NL_DATETIME.format(parsed);
}
