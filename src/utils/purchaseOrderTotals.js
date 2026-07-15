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

export function calculateLineColumnValues(lines, columnKey, lineDataType = 'text') {
  if (!Array.isArray(lines) || !columnKey) return '-';
  const uniqueValues = [];
  const seen = new Set();
  lines.forEach((line) => {
    const raw = line?.values?.[columnKey];
    if (raw === null || raw === undefined || raw === '') return;
    const display = String(formatCellValue(raw, lineDataType, columnKey)).trim();
    if (!display || display === '-') return;
    if (seen.has(display)) return;
    seen.add(display);
    uniqueValues.push(display);
  });
  if (!uniqueValues.length) return '-';
  return uniqueValues.length === 1 ? uniqueValues[0] : uniqueValues.join(', ');
}
