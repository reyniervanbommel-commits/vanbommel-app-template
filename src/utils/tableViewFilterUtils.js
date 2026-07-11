function isDateColumn(column) {
  return column?.dataType === 'date';
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
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
  const value = serializeRawValueForFilter(column, rawValue);
  return {
    operator: 'equals',
    value,
    secondaryValue: '',
  };
}

/**
 * Bepaalt of het contextmenu op een cel uitgeschakeld moet zijn.
 */
export function isCellContextMenuDisabled(column, { linkedLineTotalKeys = {}, linkedLineValueKeys = {} } = {}) {
  if (!column?.key) return true;
  if (column.dataType === 'image') return true;
  if (linkedLineTotalKeys[column.key]) return true;
  if (linkedLineValueKeys[column.key]) return true;
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
