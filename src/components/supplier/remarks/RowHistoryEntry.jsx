import React, { memo } from 'react';
import { formatDateTime, getActivityTimestamp } from './remarksFormatters';

function valueText(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function sourceDetails(entry) {
  const source = String(entry?.source || entry?.type || 'change').toLowerCase();
  if (source.includes('write')) return { icon: '↗', label: 'D365 write-back' };
  if (source.includes('custom') || source.includes('cell')) return { icon: '✎', label: 'Cell edit' };
  if (source.includes('row')) return { icon: '▤', label: 'Row action' };
  return { icon: '↻', label: 'D365 refresh' };
}

function RowHistoryEntry({ entry }) {
  const source = sourceDetails(entry);
  const author = entry?.author?.displayName || entry?.user?.displayName || entry?.user?.name || 'System';
  const title = entry?.label || entry?.actionLabel || entry?.action || source.label;
  const oldValue = valueText(entry?.oldValue);
  const newValue = valueText(entry?.newValue);

  return (
    <article className="history-entry" aria-label={`${source.label}: ${title}`}>
      <div className="history-title">
        <span aria-hidden="true">{source.icon}</span> {title}
      </div>
      <div className="history-meta">
        {entry?.column?.label || entry?.columnLabel || 'Row'} · {author} · {formatDateTime(getActivityTimestamp(entry))}
      </div>
      <div className="history-values">
        <span className="history-value" title={oldValue}>
          {oldValue}
        </span>
        <span aria-hidden="true">→</span>
        <span className="history-value" title={newValue}>
          {newValue}
        </span>
      </div>
      {entry?.status ? <span className="history-status">{entry.status}</span> : null}
    </article>
  );
}

export default memo(RowHistoryEntry);
