import { useCallback, useMemo, useState } from 'react';
import {
  EMPTY_CAPACITY_FILTERS,
  hasActiveCapacityFilters,
  isCapacityColumnFilterActive,
  rowMatchesCapacityFilters,
  sortCapacityRows,
} from '../components/rccp/rccpCapacityPlanningColumns';
import { useRccpCapacityRowSelection } from './useRccpCapacityRowSelection';

export function useRccpCapacityPlanningGrid(rows) {
  const [filters, setFilters] = useState(EMPTY_CAPACITY_FILTERS);
  const [sort, setSort] = useState({ key: null, direction: 'asc' });

  const filteredRows = useMemo(
    () => rows.filter((row) => rowMatchesCapacityFilters(row, filters)),
    [rows, filters],
  );

  const displayRows = useMemo(
    () => sortCapacityRows(filteredRows, sort.key, sort.direction),
    [filteredRows, sort.key, sort.direction],
  );

  const selection = useRccpCapacityRowSelection(displayRows);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_CAPACITY_FILTERS);
  }, []);

  const clearColumnFilter = useCallback((key) => {
    setFilters((prev) => ({ ...prev, [key]: '' }));
  }, []);

  const setSortAsc = useCallback((key) => {
    setSort({ key, direction: 'asc' });
  }, []);

  const setSortDesc = useCallback((key) => {
    setSort({ key, direction: 'desc' });
  }, []);

  const clearSort = useCallback(() => {
    setSort({ key: null, direction: 'asc' });
  }, []);

  return {
    displayRows,
    filteredCount: filteredRows.length,
    totalCount: rows.length,
    filters,
    setFilter,
    clearFilters,
    clearColumnFilter,
    hasActiveFilters: hasActiveCapacityFilters(filters),
    isColumnFilterActive: (key) => isCapacityColumnFilterActive(filters, key),
    sort,
    setSortAsc,
    setSortDesc,
    clearSort,
    ...selection,
  };
}
