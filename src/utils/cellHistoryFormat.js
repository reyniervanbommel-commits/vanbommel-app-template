import { formatCellValue } from './purchaseOrderFormat';

const STATUS_LABELS = Object.freeze({
  pending: 'Pending',
  applied: 'Applied',
  failed: 'Failed',
});

const STATUS_COLORS = Object.freeze({
  pending: 'warning',
  applied: 'success',
  failed: 'danger',
});

export function formatHistoryDate(value) {
  const formatted = formatCellValue(value, 'date');
  return formatted === '-' ? '—' : formatted;
}

export function formatHistoryValue(value, dataType) {
  if (value === null || value === undefined || value === '') return '—';
  const isDate = /^(date|datetime|date-time)$/i.test(String(dataType || ''));
  const isIsoDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(value.trim());
  if (isDate || isIsoDate) return formatHistoryDate(value);
  if (dataType === 'boolean') return value === 1 || value === true || value === '1' ? 'Yes' : 'No';
  return String(value);
}

export function formatHistoryStatus(status) {
  if (!status) return null;
  return STATUS_LABELS[status] || String(status);
}

export function historyStatusColor(status) {
  return STATUS_COLORS[status] || 'informative';
}
