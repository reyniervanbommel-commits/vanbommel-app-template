import { useCallback, useMemo, useState } from 'react';
import { mapHistoryEntryToRow, uniqueSortedValues } from './historyTableModel';

/**
 * Client-side header filters for the history table (user, action label, column label).
 */
export function useHistoryTableFilters(items) {
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [columnFilter, setColumnFilter] = useState('');

  const rows = useMemo(() => (items || []).map(mapHistoryEntryToRow), [items]);
  const userOptions = useMemo(() => uniqueSortedValues(rows, 'user'), [rows]);
  const actionOptions = useMemo(() => uniqueSortedValues(rows, 'action'), [rows]);
  const columnOptions = useMemo(() => uniqueSortedValues(rows, 'column'), [rows]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    if (userFilter && row.user !== userFilter) return false;
    if (actionFilter && row.action !== actionFilter) return false;
    if (columnFilter && row.column !== columnFilter) return false;
    return true;
  }), [actionFilter, columnFilter, rows, userFilter]);

  const resetClientFilters = useCallback(() => {
    setUserFilter('');
    setActionFilter('');
    setColumnFilter('');
  }, []);

  const onUserFilterChange = useCallback((event) => {
    setUserFilter(event.target.value);
  }, []);

  const onActionFilterChange = useCallback((event) => {
    setActionFilter(event.target.value);
  }, []);

  const onColumnFilterChange = useCallback((event) => {
    setColumnFilter(event.target.value);
  }, []);

  return useMemo(
    () => ({
      filteredRows,
      userFilter,
      actionFilter,
      columnFilter,
      userOptions,
      actionOptions,
      columnOptions,
      onUserFilterChange,
      onActionFilterChange,
      onColumnFilterChange,
      resetClientFilters,
    }),
    [
      actionFilter,
      actionOptions,
      columnFilter,
      columnOptions,
      filteredRows,
      resetClientFilters,
      userFilter,
      userOptions,
    ]
  );
}

export default useHistoryTableFilters;
