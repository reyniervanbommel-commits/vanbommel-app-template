import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@fluentui/react-components';
import HistoryFilterBar from './HistoryFilterBar';
import RowHistoryEntry from './RowHistoryEntry';
import { useHistoryTableFilters } from './useHistoryTableFilters';
import { formatDayLabel, getActivityTimestamp } from './remarksFormatters';

function buildHistoryFeedRows(items) {
  const rows = [];
  let previousDay = null;
  items.forEach((item) => {
    const day = formatDayLabel(getActivityTimestamp(item));
    if (day !== previousDay) {
      rows.push({ rowType: 'day', id: `day-${day}-${rows.length}`, label: day });
      previousDay = day;
    }
    rows.push({
      rowType: 'history',
      id: `${item?.type || 'history'}-${item?.id}`,
      item,
    });
  });
  return rows;
}

function RowHistoryFeed({
  items,
  loading,
  error,
  hasMore,
  emptyMessage,
  onLoadOlder,
  onRetry,
  columns = [],
  serverColumnId = '',
  onServerColumnChange,
  serverActionFilter = 'updated',
  onServerActionFilterChange,
  useServerActionFilter = false,
}) {
  const filters = useHistoryTableFilters(items);

  useEffect(() => {
    filters.resetClientFilters();
  }, [items, serverColumnId, serverActionFilter, filters.resetClientFilters]);

  const columnScopeOptions = useMemo(
    () => columns.map((column) => ({ value: String(column.id), label: column.label })),
    [columns]
  );

  const feedRows = useMemo(() => buildHistoryFeedRows(filters.filteredItems), [filters.filteredItems]);

  const renderRow = useCallback((row) => {
    if (row.rowType === 'day') {
      return (
        <div className="day-separator" key={row.id}>
          {row.label}
        </div>
      );
    }
    return <RowHistoryEntry key={row.id} entry={row.item} />;
  }, []);

  if (loading) {
    return (
      <div className="history-feed-state" aria-busy="true" aria-label="Loading history">
        <div className="remarks-skeleton" />
        <div className="remarks-skeleton" />
      </div>
    );
  }

  if (error && feedRows.length === 0 && !items?.length) {
    return (
      <div className="history-feed-state" role="alert">
        <p className="remarks-error">{error}</p>
        <Button onClick={onRetry}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="history-feed-wrap">
      <HistoryFilterBar
        userFilter={filters.userFilter}
        userOptions={filters.userOptions}
        onUserFilterChange={filters.onUserFilterChange}
        actionFilter={filters.actionFilter}
        actionOptions={filters.actionOptions}
        onActionFilterChange={filters.onActionFilterChange}
        columnFilter={onServerColumnChange ? serverColumnId : filters.columnFilter}
        columnOptions={onServerColumnChange ? columnScopeOptions : filters.columnOptions.map((option) => ({
          value: option,
          label: option,
        }))}
        onColumnChange={onServerColumnChange || filters.onColumnFilterChange}
        useServerActionFilter={useServerActionFilter}
        serverActionFilter={serverActionFilter}
        onServerActionFilterChange={onServerActionFilterChange}
      />
      {error ? (
        <div className="remarks-state-actions" role="alert">
          <span className="remarks-error">{error}</span>
          <Button size="small" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
      {feedRows.length === 0 ? (
        <div className="history-feed-empty">{emptyMessage}</div>
      ) : (
        <div className="history-feed" aria-label="Row history">
          {feedRows.map(renderRow)}
        </div>
      )}
      {hasMore ? (
        <div className="history-feed-footer">
          <Button onClick={onLoadOlder}>Show older history</Button>
        </div>
      ) : null}
    </div>
  );
}

export default memo(RowHistoryFeed);
