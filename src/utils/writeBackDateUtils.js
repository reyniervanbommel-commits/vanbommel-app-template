function padDatePart(value) {
  return String(value).padStart(2, '0');
}

export function isDateDataType(dataType) {
  const normalized = String(dataType || '').trim().toLowerCase();
  return normalized === 'date' || normalized === 'datetime' || normalized === 'date-time';
}

export function normalizeDateValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const dmyMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const probe = new Date(Date.UTC(year, month - 1, day));
      if (
        probe.getUTCFullYear() === year
        && probe.getUTCMonth() === month - 1
        && probe.getUTCDate() === day
      ) {
        return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
      }
    }
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toISOString().slice(0, 10);
}

export function toDisplayDateValue(value) {
  const normalized = normalizeDateValue(value);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value ?? '');
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function isDateLikeColumn(column, value) {
  if (isDateDataType(column?.dataType)) return true;
  const hints = `${String(column?.key || '')} ${String(column?.label || '')}`;
  if (/date|datum|aangemaakt|created/i.test(hints)) return true;
  if (typeof value === 'string') {
    return /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.test(value.trim());
  }
  return false;
}

export function toInputValue(value, dataType, treatAsDate = false) {
  if (value === null || value === undefined) return '';
  if (treatAsDate || isDateDataType(dataType)) {
    return toDisplayDateValue(value);
  }
  return String(value);
}

export function toCalendarValue(value) {
  const normalized = normalizeDateValue(value);
  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : '';
}
