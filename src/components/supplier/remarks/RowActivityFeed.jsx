import React, { memo, useCallback, useMemo } from 'react';
import { Button, Spinner } from '@fluentui/react-components';
import RemarkMessageCard from './RemarkMessageCard';
import RowHistoryEntry from './RowHistoryEntry';
import { formatDayLabel, getActivityTimestamp, isRemarkActivity, toRemark } from './remarksFormatters';

function buildFeedRows(items) {
  const rows = [];
  let previousDay = null;
  items.forEach((item) => {
    const day = formatDayLabel(getActivityTimestamp(toRemark(item)));
    if (day !== previousDay) {
      rows.push({ rowType: 'day', id: `day-${day}-${rows.length}`, label: day });
      previousDay = day;
    }
    rows.push({
      rowType: isRemarkActivity(item) ? 'remark' : 'history',
      id: `${item?.type || item?.kind || 'activity'}-${item?.id}`,
      item,
    });
  });
  return rows;
}

function RowActivityFeed({
  items,
  loading,
  error,
  hasMore,
  emptyMessage,
  currentUser,
  onLoadOlder,
  onRetry,
  remarkActions,
  olderLabel = 'Show older activity',
}) {
  const feedRows = useMemo(() => buildFeedRows(items || []), [items]);

  const renderRow = useCallback(
    (row) => {
      if (row.rowType === 'day') {
        return (
          <div className="day-separator" key={row.id}>
            {row.label}
          </div>
        );
      }
      if (row.rowType === 'remark') {
        return (
          <RemarkMessageCard
            key={row.id}
            remark={toRemark(row.item)}
            currentUser={currentUser}
            onDelete={remarkActions.onDelete}
            onReaction={remarkActions.onReaction}
          />
        );
      }
      return <RowHistoryEntry key={row.id} entry={row.item} />;
    },
    [currentUser, remarkActions]
  );

  if (loading) {
    return (
      <div className="remarks-feed" aria-busy="true" aria-label="Loading activity">
        <div className="remarks-skeleton" />
        <div className="remarks-skeleton" />
      </div>
    );
  }

  if (error && feedRows.length === 0) {
    return (
      <div className="remarks-state" role="alert">
        <p className="remarks-error">{error}</p>
        <Button onClick={onRetry}>Retry</Button>
      </div>
    );
  }

  if (feedRows.length === 0) {
    return <div className="remarks-state">{emptyMessage}</div>;
  }

  return (
    <div className="remarks-feed">
      {error ? (
        <div className="remarks-state-actions" role="alert">
          <span className="remarks-error">{error}</span>
          <Button size="small" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
      {feedRows.map(renderRow)}
      {hasMore ? <Button onClick={onLoadOlder}>{olderLabel}</Button> : null}
    </div>
  );
}

export default memo(RowActivityFeed);
