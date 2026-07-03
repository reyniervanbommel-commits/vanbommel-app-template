import { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_GROUPING_COLOR = '#f4e6ed';

function getDefaultGroupingColumnKey(columns) {
  if (!Array.isArray(columns) || columns.length === 0) return '';
  const statusColumn = columns.find((column) => column.key === 'status');
  return statusColumn?.key || columns[0].key;
}

function normalizeGroupLabel(value) {
  if (value === null || value === undefined) return 'No value';
  const text = String(value).trim();
  return text ? text : 'No value';
}

function isHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || ''));
}

/**
 * Builds grouped row data and grouping controls for the purchase order board.
 * Input: table rows + column definitions.
 * Output: grouped rows, active grouping metadata, and grouping handlers.
 */
export function usePurchaseOrderGrouping({ rows, columns }) {
  const safeColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);
  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
  const [groupingColumnKey, setGroupingColumnKey] = useState(() => getDefaultGroupingColumnKey(safeColumns));
  const [groupingColor, setGroupingColor] = useState(DEFAULT_GROUPING_COLOR);

  useEffect(() => {
    setGroupingColumnKey((current) => {
      if (current && safeColumns.some((column) => column.key === current)) {
        return current;
      }
      return getDefaultGroupingColumnKey(safeColumns);
    });
  }, [safeColumns]);

  const groupingColumnLabel = useMemo(() => {
    const activeColumn = safeColumns.find((column) => column.key === groupingColumnKey);
    return activeColumn?.label || 'Category';
  }, [safeColumns, groupingColumnKey]);

  const groupedRows = useMemo(() => {
    if (!groupingColumnKey) {
      return [{ groupName: 'All rows', entries: safeRows }];
    }

    const byGroup = new Map();
    safeRows.forEach((entry) => {
      const rawValue = entry.order?.values?.[groupingColumnKey];
      const groupName = normalizeGroupLabel(rawValue);
      if (!byGroup.has(groupName)) {
        byGroup.set(groupName, []);
      }
      byGroup.get(groupName).push(entry);
    });

    return Array.from(byGroup.entries()).map(([groupName, entries]) => ({ groupName, entries }));
  }, [groupingColumnKey, safeRows]);

  const setGroupingColumn = useCallback((columnKey) => {
    setGroupingColumnKey(columnKey || '');
  }, []);

  const clearGrouping = useCallback(() => {
    setGroupingColumnKey('');
  }, []);

  const setGroupingBarColor = useCallback((value) => {
    if (!isHexColor(value)) return;
    setGroupingColor(value);
  }, []);

  // Serialiseer de grouping-state (kolom + kleur) voor opslag in een saved view.
  const exportState = useCallback(() => ({
    columnKey: groupingColumnKey,
    color: groupingColor,
  }), [groupingColumnKey, groupingColor]);

  // Pas een opgeslagen grouping-state toe. Een onbekende/verwijderde kolom-key valt
  // terug op "geen grouping"; een ongeldige kleur wordt genegeerd.
  const applyState = useCallback((state) => {
    const key = state?.columnKey || '';
    const validKey = key && safeColumns.some((column) => column.key === key);
    setGroupingColumnKey(validKey ? key : '');
    if (isHexColor(state?.color)) {
      setGroupingColor(state.color);
    }
  }, [safeColumns]);

  return useMemo(() => ({
    groupedRows,
    groupingColumnKey,
    groupingColumnLabel,
    groupingColor,
    setGroupingColumn,
    clearGrouping,
    setGroupingBarColor,
    exportState,
    applyState,
  }), [
    groupedRows,
    groupingColumnKey,
    groupingColumnLabel,
    groupingColor,
    setGroupingColumn,
    clearGrouping,
    setGroupingBarColor,
    exportState,
    applyState,
  ]);
}
