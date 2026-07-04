import { useCallback, useMemo, useState } from 'react';

export const TEXT_FILTER_OPERATORS = {
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  notStartsWith: 'does not start with',
  oneOf: 'one of',
};

export const DATE_FILTER_OPERATORS = {
  before: 'before',
  after: 'after',
  between: 'between',
  inNextWeeks: 'in the next xx weeks',
  inNextDays: 'in the next xx days',
  nextWeek: 'next week',
};

const SORT_DIRECTIONS = {
  none: 'none',
  asc: 'asc',
  desc: 'desc',
};

function isDateColumn(column) {
  return column?.dataType === 'date';
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function parseOneOfValues(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function startOfNextWeek() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = ((8 - day) % 7) || 7;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMonday);
  return target.getTime();
}

function resolveFilterModel(column, filter) {
  const isDate = isDateColumn(column);
  if (isDate) {
    return {
      operator: filter?.operator || 'before',
      value: filter?.value || '',
      secondaryValue: filter?.secondaryValue || '',
    };
  }
  return {
    operator: filter?.operator || 'contains',
    value: filter?.value || '',
    secondaryValue: '',
  };
}

function hasActiveFilter(column, filter) {
  if (!filter) return false;
  if (isDateColumn(column)) {
    if (filter.operator === 'nextWeek') return true;
    if (filter.operator === 'between') return Boolean(filter.value && filter.secondaryValue);
    return Boolean(filter.value);
  }
  return Boolean(filter.value);
}

function dateMatchesFilter(rawValue, filter) {
  const rowTime = parseDateValue(rawValue);
  if (rowTime === null) return false;

  if (filter.operator === 'before') {
    const target = parseDateValue(filter.value);
    return target !== null ? rowTime < target : true;
  }
  if (filter.operator === 'after') {
    const target = parseDateValue(filter.value);
    return target !== null ? rowTime > target : true;
  }
  if (filter.operator === 'between') {
    const from = parseDateValue(filter.value);
    const to = parseDateValue(filter.secondaryValue);
    if (from === null || to === null) return true;
    const lower = Math.min(from, to);
    const upper = Math.max(from, to);
    return rowTime >= lower && rowTime <= upper;
  }
  if (filter.operator === 'inNextWeeks') {
    const count = Number(filter.value);
    if (!Number.isFinite(count) || count <= 0) return true;
    const start = startOfToday();
    const end = start + (count * 7 * 24 * 60 * 60 * 1000);
    return rowTime >= start && rowTime <= end;
  }
  if (filter.operator === 'inNextDays') {
    const count = Number(filter.value);
    if (!Number.isFinite(count) || count <= 0) return true;
    const start = startOfToday();
    const end = start + (count * 24 * 60 * 60 * 1000);
    return rowTime >= start && rowTime <= end;
  }
  if (filter.operator === 'nextWeek') {
    const weekStart = startOfNextWeek();
    const weekEnd = weekStart + (7 * 24 * 60 * 60 * 1000);
    return rowTime >= weekStart && rowTime < weekEnd;
  }
  return true;
}

function textMatchesFilter(rawValue, filter) {
  const normalized = normalizeText(rawValue);
  const query = normalizeText(filter.value);

  if (!query && filter.operator !== 'oneOf') return true;
  if (filter.operator === 'contains') return normalized.includes(query);
  if (filter.operator === 'notContains') return !normalized.includes(query);
  if (filter.operator === 'startsWith') return normalized.startsWith(query);
  if (filter.operator === 'notStartsWith') return !normalized.startsWith(query);
  if (filter.operator === 'oneOf') {
    const options = parseOneOfValues(filter.value);
    if (!options.length) return true;
    return options.includes(normalized);
  }
  return true;
}

function compareValues(a, b, column) {
  const isDate = isDateColumn(column);
  if (isDate) {
    const left = parseDateValue(a);
    const right = parseDateValue(b);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return left - right;
  }

  if (column?.dataType === 'number') {
    const left = Number(a);
    const right = Number(b);
    const leftIsNumber = Number.isFinite(left);
    const rightIsNumber = Number.isFinite(right);
    if (!leftIsNumber && !rightIsNumber) return 0;
    if (!leftIsNumber) return 1;
    if (!rightIsNumber) return -1;
    return left - right;
  }

  const left = normalizeText(a);
  const right = normalizeText(b);
  return left.localeCompare(right, 'nl-NL', { sensitivity: 'base' });
}

export function usePurchaseOrderTableView({ items, columns }) {
  const [sortState, setSortState] = useState({ columnKey: '', direction: SORT_DIRECTIONS.none });
  const [filterByColumn, setFilterByColumn] = useState({});

  const columnByKey = useMemo(
    () => new Map(columns.map((column) => [column.key, column])),
    [columns]
  );

  const setFilterOperator = useCallback((columnKey, operator) => {
    setFilterByColumn((prev) => {
      const column = columnByKey.get(columnKey);
      const current = resolveFilterModel(column, prev[columnKey]);
      return {
        ...prev,
        [columnKey]: {
          ...current,
          operator,
        },
      };
    });
  }, [columnByKey]);

  const setFilterValue = useCallback((columnKey, value) => {
    setFilterByColumn((prev) => {
      const column = columnByKey.get(columnKey);
      const current = resolveFilterModel(column, prev[columnKey]);
      return {
        ...prev,
        [columnKey]: {
          ...current,
          value,
        },
      };
    });
  }, [columnByKey]);

  const setFilterSecondaryValue = useCallback((columnKey, secondaryValue) => {
    setFilterByColumn((prev) => {
      const column = columnByKey.get(columnKey);
      const current = resolveFilterModel(column, prev[columnKey]);
      return {
        ...prev,
        [columnKey]: {
          ...current,
          secondaryValue,
        },
      };
    });
  }, [columnByKey]);

  const clearColumnFilter = useCallback((columnKey) => {
    setFilterByColumn((prev) => {
      if (!prev[columnKey]) return prev;
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterByColumn({});
  }, []);

  const toggleSort = useCallback((columnKey) => {
    setSortState((prev) => {
      if (prev.columnKey !== columnKey) {
        return { columnKey, direction: SORT_DIRECTIONS.asc };
      }
      if (prev.direction === SORT_DIRECTIONS.asc) {
        return { columnKey, direction: SORT_DIRECTIONS.desc };
      }
      if (prev.direction === SORT_DIRECTIONS.desc) {
        return { columnKey: '', direction: SORT_DIRECTIONS.none };
      }
      return { columnKey, direction: SORT_DIRECTIONS.asc };
    });
  }, []);

  const clearSort = useCallback(() => {
    setSortState({ columnKey: '', direction: SORT_DIRECTIONS.none });
  }, []);

  const setSortDirection = useCallback((columnKey, direction) => {
    const normalizedDirection = direction === SORT_DIRECTIONS.asc || direction === SORT_DIRECTIONS.desc
      ? direction
      : SORT_DIRECTIONS.none;
    if (!columnKey || normalizedDirection === SORT_DIRECTIONS.none) {
      setSortState({ columnKey: '', direction: SORT_DIRECTIONS.none });
      return;
    }
    setSortState({ columnKey, direction: normalizedDirection });
  }, []);

  // Serialiseer de huidige filter/sort-state voor opslag in een saved view.
  const exportState = useCallback(() => ({
    filterByColumn,
    sortState,
  }), [filterByColumn, sortState]);

  // Pas een opgeslagen filter/sort-state in één keer toe. Onbekende kolom-keys
  // (bijv. verwijderde/hernoemde D365-kolommen) worden genegeerd.
  const applyState = useCallback((state) => {
    const rawFilters = state?.filterByColumn && typeof state.filterByColumn === 'object'
      ? state.filterByColumn
      : {};
    const nextFilters = {};
    Object.entries(rawFilters).forEach(([key, filter]) => {
      const column = columnByKey.get(key);
      if (!column || !filter) return;
      nextFilters[key] = resolveFilterModel(column, filter);
    });
    setFilterByColumn(nextFilters);

    const rawSort = state?.sortState && typeof state.sortState === 'object' ? state.sortState : {};
    const validSortColumn = rawSort.columnKey && columnByKey.has(rawSort.columnKey);
    const validDirection = rawSort.direction === SORT_DIRECTIONS.asc || rawSort.direction === SORT_DIRECTIONS.desc;
    if (validSortColumn && validDirection) {
      setSortState({ columnKey: rawSort.columnKey, direction: rawSort.direction });
    } else {
      setSortState({ columnKey: '', direction: SORT_DIRECTIONS.none });
    }
  }, [columnByKey]);

  const processedItems = useMemo(() => {
    const activeFilters = columns
      .map((column) => [column, resolveFilterModel(column, filterByColumn[column.key])])
      .filter(([column, filter]) => hasActiveFilter(column, filter));

    const filtered = activeFilters.length
      ? items.filter((order) => {
        return activeFilters.every(([column, filter]) => {
          const rawValue = order?.values?.[column.key];
          if (isDateColumn(column)) {
            return dateMatchesFilter(rawValue, filter);
          }
          return textMatchesFilter(rawValue, filter);
        });
      })
      : items;

    if (!sortState.columnKey || sortState.direction === SORT_DIRECTIONS.none) {
      return filtered;
    }

    const sortColumn = columnByKey.get(sortState.columnKey);
    if (!sortColumn) {
      return filtered;
    }
    // Image-kolommen hebben geen opgeslagen waarde (afgeleide URL); sorteren is
    // zinloos en zou alleen op lege waarden neerkomen. Sla het over.
    if (sortColumn.dataType === 'image') {
      return filtered;
    }

    const sorted = [...filtered].sort((leftOrder, rightOrder) => {
      const leftValue = leftOrder?.values?.[sortColumn.key];
      const rightValue = rightOrder?.values?.[sortColumn.key];
      const base = compareValues(leftValue, rightValue, sortColumn);
      if (sortState.direction === SORT_DIRECTIONS.desc) return -base;
      return base;
    });
    return sorted;
  }, [columns, filterByColumn, items, sortState, columnByKey]);

  const activeFilterCount = useMemo(
    () => columns.reduce((count, column) => count + (hasActiveFilter(column, resolveFilterModel(column, filterByColumn[column.key])) ? 1 : 0), 0),
    [columns, filterByColumn]
  );

  return useMemo(() => ({
    processedItems,
    sortState,
    filterByColumn,
    activeFilterCount,
    hasActiveSort: Boolean(sortState.columnKey && sortState.direction !== SORT_DIRECTIONS.none),
    setFilterOperator,
    setFilterValue,
    setFilterSecondaryValue,
    clearColumnFilter,
    clearAllFilters,
    toggleSort,
    clearSort,
    setSortDirection,
    exportState,
    applyState,
  }), [
    processedItems,
    sortState,
    filterByColumn,
    activeFilterCount,
    setFilterOperator,
    setFilterValue,
    setFilterSecondaryValue,
    clearColumnFilter,
    clearAllFilters,
    toggleSort,
    clearSort,
    setSortDirection,
    exportState,
    applyState,
  ]);
}
