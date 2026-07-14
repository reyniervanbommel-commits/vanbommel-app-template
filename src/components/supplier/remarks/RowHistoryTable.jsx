import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@fluentui/react-components';
import HistoryTableHeaderFilter from './HistoryTableHeaderFilter';
import { useHistoryTableFilters } from './useHistoryTableFilters';

const SERVER_ACTION_OPTIONS = [
  { value: 'updated', label: 'Updated only' },
  { value: 'all', label: 'All actions' },
];

function RowHistoryTable({
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

  const handleServerColumnChange = useCallback(
    (event) => {
      onServerColumnChange?.(event);
    },
    [onServerColumnChange]
  );

  const handleServerActionChange = useCallback(
    (event) => {
      onServerActionFilterChange?.(event);
    },
    [onServerActionFilterChange]
  );

  if (loading) {
    return (
      <div className="history-table-state" aria-busy="true" aria-label="Loading history">
        <div className="remarks-skeleton" />
        <div className="remarks-skeleton" />
      </div>
    );
  }

  if (error && filters.filteredRows.length === 0 && !items?.length) {
    return (
      <div className="history-table-state" role="alert">
        <p className="remarks-error">{error}</p>
        <Button onClick={onRetry}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="history-table-wrap">
      {error ? (
        <div className="remarks-state-actions" role="alert">
          <span className="remarks-error">{error}</span>
          <Button size="small" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
      <table className="history-table" aria-label="Row history">
        <thead>
          <tr>
            <HistoryTableHeaderFilter label="Date" />
            <HistoryTableHeaderFilter
              label="Action"
              value={useServerActionFilter ? serverActionFilter : filters.actionFilter}
              optionItems={useServerActionFilter ? SERVER_ACTION_OPTIONS : undefined}
              options={useServerActionFilter ? undefined : filters.actionOptions}
              allLabel={useServerActionFilter ? undefined : 'All actions'}
              ariaLabel="Filter by action"
              onChange={useServerActionFilter ? handleServerActionChange : filters.onActionFilterChange}
            />
            <HistoryTableHeaderFilter
              label="Column"
              value={onServerColumnChange ? serverColumnId : filters.columnFilter}
              optionItems={onServerColumnChange ? columnScopeOptions : undefined}
              options={onServerColumnChange ? undefined : filters.columnOptions}
              allLabel="All columns"
              ariaLabel="Filter by column"
              onChange={onServerColumnChange ? handleServerColumnChange : filters.onColumnFilterChange}
            />
            <HistoryTableHeaderFilter
              label="User"
              value={filters.userFilter}
              options={filters.userOptions}
              allLabel="All users"
              ariaLabel="Filter by user"
              onChange={filters.onUserFilterChange}
            />
            <HistoryTableHeaderFilter label="Previous" />
            <HistoryTableHeaderFilter label="New" />
            <HistoryTableHeaderFilter label="Status" />
          </tr>
        </thead>
        <tbody>
          {filters.filteredRows.length === 0 ? (
            <tr>
              <td className="history-table-empty" colSpan={7}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            filters.filteredRows.map((row) => (
              <tr key={row.id}>
                <td className="history-table-date">{row.date}</td>
                <td className="history-table-action">{row.action}</td>
                <td className="history-table-column" title={row.column}>
                  {row.column}
                </td>
                <td className="history-table-user">{row.user}</td>
                <td className="history-table-value" title={row.previous}>
                  {row.previous}
                </td>
                <td className="history-table-value" title={row.next}>
                  {row.next}
                </td>
                <td className="history-table-status">
                  {row.status ? <span className="history-status">{row.status}</span> : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {hasMore ? (
        <div className="history-table-footer">
          <Button onClick={onLoadOlder}>Show older history</Button>
        </div>
      ) : null}
    </div>
  );
}

export default memo(RowHistoryTable);
