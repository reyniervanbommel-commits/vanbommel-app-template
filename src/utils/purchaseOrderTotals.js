import { formatCellValue } from './purchaseOrderFormat';

function toNumeric(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function calculateLineColumnSum(lines, columnKey) {
  if (!Array.isArray(lines) || !columnKey) return 0;
  return lines.reduce((total, line) => {
    const raw = line?.values?.[columnKey];
    const numeric = toNumeric(raw);
    return numeric === null ? total : total + numeric;
  }, 0);
}

export function isSummableLineColumn(column) {
  return Boolean(column && column.dataType === 'number');
}

export function filterSummableLineColumnKeys(columnKeys, lineColumns) {
  const byKey = new Map((Array.isArray(lineColumns) ? lineColumns : []).map((column) => [column.key, column]));
  return (Array.isArray(columnKeys) ? columnKeys : []).filter((key) => isSummableLineColumn(byKey.get(key)));
}

// Ontdubbelde, geformatteerde lijst regelwaarden. Gedeeld door formatLinkedLineValues
// (platte tekst) en getLinkedLineValuePreview (eerste waarde + "+N"-badge), zodat beide
// weergaven altijd hetzelfde ontdubbelde resultaat gebruiken.
function dedupeFormattedLineValues(rawValues, lineDataType, columnKey) {
  if (!Array.isArray(rawValues)) return [];
  const uniqueValues = [];
  const seen = new Set();
  rawValues.forEach((raw) => {
    if (raw === null || raw === undefined || raw === '') return;
    const display = String(formatCellValue(raw, lineDataType, columnKey)).trim();
    if (!display || display === '-') return;
    if (seen.has(display)) return;
    seen.add(display);
    uniqueValues.push(display);
  });
  return uniqueValues;
}

// Ontdubbelde, geformatteerde weergave van een reeks regelwaarden. De board-read levert
// deze ruwe waarden per gekoppelde header-kolom mee (linkedLineValues), zodat de sublijnen
// zelf niet in de payload hoeven te zitten.
export function formatLinkedLineValues(rawValues, lineDataType = 'text', columnKey = '') {
  const uniqueValues = dedupeFormattedLineValues(rawValues, lineDataType, columnKey);
  if (!uniqueValues.length) return '-';
  return uniqueValues.length === 1 ? uniqueValues[0] : uniqueValues.join(', ');
}

// Zelfde ontdubbeling als formatLinkedLineValues, maar als eerste-waarde + aantal-overige,
// analoog aan de "+N"-badge van de productafbeelding-kolom (getPurchaseOrderProductImageSummary).
export function getLinkedLineValuePreview(rawValues, lineDataType = 'text', columnKey = '') {
  const uniqueValues = dedupeFormattedLineValues(rawValues, lineDataType, columnKey);
  if (!uniqueValues.length) return { firstValue: '-', additionalCount: 0, allValuesLabel: '-' };
  return {
    firstValue: uniqueValues[0],
    additionalCount: Math.max(uniqueValues.length - 1, 0),
    allValuesLabel: uniqueValues.join(', '),
  };
}

export function calculateLineColumnValues(lines, columnKey, lineDataType = 'text') {
  if (!Array.isArray(lines) || !columnKey) return '-';
  return formatLinkedLineValues(lines.map((line) => line?.values?.[columnKey]), lineDataType, columnKey);
}
