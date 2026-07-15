import React, { memo } from 'react';
import { formatHistoryValue } from '../../../utils/cellHistoryFormat';
import { formatDateTime, getActivityTimestamp } from './remarksFormatters';
import { historyEntryAction, historyEntryAuthor, historyEntryColumn } from './historyTableModel';

function sourceDetails(entry) {
  const source = String(entry?.source || entry?.type || 'change').toLowerCase();
  if (source.includes('write')) return { icon: '↗', label: 'D365 write-back' };
  if (source.includes('custom') || source.includes('cell')) return { icon: '✎', label: 'Cell edit' };
  if (source.includes('row')) return { icon: '▤', label: 'Row action' };
  return { icon: '↻', label: 'D365 refresh' };
}

function actionClassName(action) {
  const normalized = String(action || '').toLowerCase();
  if (normalized.includes('insert')) return 'history-action-insert';
  if (normalized.includes('correct')) return 'history-action-correct';
  return 'history-action-update';
}

function RowHistoryEntry({ entry }) {
  const source = sourceDetails(entry);
  const author = historyEntryAuthor(entry);
  const columnLabel = historyEntryColumn(entry);
  const action = historyEntryAction(entry);
  const dataType = entry?.column?.dataType || entry?.dataType || null;
  const oldValue = formatHistoryValue(entry?.oldValue, dataType);
  const newValue = formatHistoryValue(entry?.newValue, dataType);
  const hasDiff = oldValue !== newValue || entry?.oldValue != null || entry?.newValue != null;

  return (
    <article className="history-entry-card" aria-label={`${source.label}: ${columnLabel}`}>
      <div className="history-entry-header">
        <span className="history-entry-icon" aria-hidden="true">
          {source.icon}
        </span>
        <div className="history-entry-heading">
          <div className="history-entry-title-row">
            <span className="history-entry-title">{columnLabel}</span>
            <span className={`history-action-badge ${actionClassName(action)}`}>{action}</span>
          </div>
          <div className="history-entry-meta">
            {author} · {formatDateTime(getActivityTimestamp(entry))}
          </div>
        </div>
      </div>
      {hasDiff ? (
        <div className="history-diff">
          <div className="history-diff-row history-diff-old">
            <span className="history-diff-label">Previous</span>
            <span className="history-diff-value">{oldValue}</span>
          </div>
          <div className="history-diff-row history-diff-new">
            <span className="history-diff-label">New</span>
            <span className="history-diff-value">{newValue}</span>
          </div>
        </div>
      ) : null}
      {entry?.status ? <span className="history-status">{entry.status}</span> : null}
    </article>
  );
}

export default memo(RowHistoryEntry);
