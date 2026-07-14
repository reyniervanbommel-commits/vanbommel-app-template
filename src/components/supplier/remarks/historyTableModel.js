import { formatHistoryStatus, formatHistoryValue } from '../../../utils/cellHistoryFormat';
import { formatDateTime, getActivityTimestamp, isRemarkActivity } from './remarksFormatters';

export function historyEntryAuthor(entry) {
  return (
    entry?.author?.displayName
    || entry?.user?.displayName
    || entry?.user?.name
    || entry?.actor?.name
    || 'System'
  );
}

export function historyEntryColumn(entry) {
  return entry?.column?.label || entry?.columnLabel || entry?.fieldKey || 'Row';
}

export function historyEntryAction(entry) {
  const action = entry?.action || entry?.actionLabel;
  if (action) return String(action);
  const source = String(entry?.source || entry?.type || 'change').toLowerCase();
  if (source.includes('write')) return 'correct';
  if (source.includes('custom') || source.includes('cell')) return 'UPDATE';
  if (source.includes('row')) return 'insert';
  return 'UPDATE';
}

export function mapHistoryEntryToRow(entry) {
  const dataType = entry?.column?.dataType || entry?.dataType || null;
  return {
    id: `${entry?.type || 'history'}-${entry?.id || entry?.sourceId}`,
    date: formatDateTime(getActivityTimestamp(entry)),
    action: historyEntryAction(entry),
    column: historyEntryColumn(entry),
    user: historyEntryAuthor(entry),
    previous: formatHistoryValue(entry?.oldValue, dataType),
    next: formatHistoryValue(entry?.newValue, dataType),
    status: formatHistoryStatus(entry?.status) || '',
  };
}

export function partitionActivityItems(items) {
  const remarks = [];
  const history = [];
  for (const item of items || []) {
    if (isRemarkActivity(item)) remarks.push(item);
    else history.push(item);
  }
  return { remarks, history };
}

export function uniqueSortedValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}
