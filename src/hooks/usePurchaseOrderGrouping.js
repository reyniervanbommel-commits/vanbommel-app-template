import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatCellValue } from '../utils/purchaseOrderFormat';
import { formatPurchStatusDisplay, isPurchaseOrderStatusColumn } from '../utils/purchStatusDisplay';
import { isHexColor } from '../utils/hexColor';
import { toNumeric } from '../utils/purchaseOrderTotals';

const DEFAULT_GROUPING_COLOR = '#f4e6ed';

function getDefaultGroupingColumnKey(columns) {
  if (!Array.isArray(columns) || columns.length === 0) return '';
  const statusColumn = columns.find((column) => column.key === 'status');
  return statusColumn?.key || '';
}

function parseGroupingColumnKeys(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  const singleValue = String(value || '').trim();
  if (!singleValue) return [];
  return singleValue
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function dedupeKeys(keys) {
  return Array.from(new Set(parseGroupingColumnKeys(keys)));
}

function pickColorByColumn(columnKey, colorsByColumn, fallbackColor = DEFAULT_GROUPING_COLOR) {
  if (!columnKey) return fallbackColor;
  const candidate = colorsByColumn?.[columnKey];
  return isHexColor(candidate) ? candidate : fallbackColor;
}

function isDateLikeGroupingColumn(column) {
  const dataType = String(column?.dataType || '').trim().toLowerCase();
  const columnText = `${column?.key || ''} ${column?.label || ''}`;
  return dataType === 'date'
    || dataType === 'datetime'
    || dataType === 'date-time'
    || /date|datum|aangemaakt|created|delivery|ship/i.test(columnText);
}

function isNumberGroupingSummaryColumn(column) {
  return String(column?.dataType || '').trim().toLowerCase() === 'number';
}

function normalizeGroupLabel(value, column) {
  if (value === null || value === undefined) return 'No value';
  if (isDateLikeGroupingColumn(column)) {
    const formattedDate = formatCellValue(value, column?.dataType, {
      columnKey: column?.key,
      columnLabel: column?.label,
    });
    if (formattedDate && formattedDate !== '-') return formattedDate;
  }
  if (isPurchaseOrderStatusColumn(column)) {
    const mapped = formatPurchStatusDisplay(value);
    return mapped ? mapped : 'No value';
  }
  const text = String(value).trim();
  return text ? text : 'No value';
}

/**
 * Builds grouped row data and grouping controls for the purchase order board.
 * Input: table rows + column definitions.
 * Output: grouped rows, active grouping metadata, and grouping handlers.
 */
export function usePurchaseOrderGrouping({ rows, columns }) {
  const safeColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);
  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
  const [groupingColumnKeys, setGroupingColumnKeys] = useState(() => {
    const defaultKey = getDefaultGroupingColumnKey(safeColumns);
    return defaultKey ? [defaultKey] : [];
  });
  const [groupingColorsByColumn, setGroupingColorsByColumn] = useState(() => {
    const defaultKey = getDefaultGroupingColumnKey(safeColumns);
    return defaultKey ? { [defaultKey]: DEFAULT_GROUPING_COLOR } : {};
  });
  const [summaryColumnKeys, setSummaryColumnKeys] = useState([]);

  useEffect(() => {
    setGroupingColumnKeys((current) => {
      const normalizedCurrent = dedupeKeys(current);
      if (normalizedCurrent.length === 0) {
        return [];
      }
      const validCurrent = normalizedCurrent.filter((key) => safeColumns.some((column) => column.key === key));
      if (validCurrent.length > 0) {
        return validCurrent;
      }
      const defaultKey = getDefaultGroupingColumnKey(safeColumns);
      return defaultKey ? [defaultKey] : [];
    });
  }, [safeColumns]);

  useEffect(() => {
    setGroupingColorsByColumn((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => {
        if (!safeColumns.some((column) => column.key === key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [safeColumns]);
  useEffect(() => {
    setSummaryColumnKeys((current) => current.filter((key) => isNumberGroupingSummaryColumn(safeColumns.find((column) => column.key === key))));
  }, [safeColumns]);

  const groupingColumnKey = useMemo(() => groupingColumnKeys.join(','), [groupingColumnKeys]);
  const groupingColor = useMemo(
    () => pickColorByColumn(groupingColumnKeys[0], groupingColorsByColumn),
    [groupingColumnKeys, groupingColorsByColumn]
  );

  const columnLabelByKey = useMemo(
    () => safeColumns.reduce((acc, column) => {
      if (column?.key) acc[column.key] = column.label || column.key;
      return acc;
    }, {}),
    [safeColumns]
  );
  const columnByKey = useMemo(
    () => safeColumns.reduce((acc, column) => {
      if (column?.key) acc[column.key] = column;
      return acc;
    }, {}),
    [safeColumns]
  );

  const groupingColumnLabel = useMemo(() => {
    if (!groupingColumnKeys.length) return 'Category';
    return groupingColumnKeys
      .map((columnKey) => columnLabelByKey[columnKey] || columnKey)
      .join(' + ');
  }, [columnLabelByKey, groupingColumnKeys]);
  const summaryColumns = useMemo(
    () => summaryColumnKeys
      .map((columnKey) => columnByKey[columnKey])
      .filter(isNumberGroupingSummaryColumn),
    [columnByKey, summaryColumnKeys]
  );

  const groupedRows = useMemo(() => {
    if (!groupingColumnKeys.length) {
      return [{
        groupKey: 'all-rows',
        groupName: '',
        groupLabel: '',
        groupColumnKey: '',
        groupLevel: 0,
        groupColor: DEFAULT_GROUPING_COLOR,
        groupSummaries: [],
        ancestorGroupKeys: [],
        entries: safeRows,
        entriesForSelection: safeRows,
      }];
    }

    const buildGroupSummaries = (bucketEntries) => summaryColumns.map((column) => {
      const total = bucketEntries.reduce((sum, entry) => {
        const numeric = toNumeric(entry.order?.values?.[column.key]);
        return numeric === null ? sum : sum + numeric;
      }, 0);
      return {
        columnKey: column.key,
        label: column.label || column.key,
        value: total,
        displayValue: formatCellValue(total, 'number'),
      };
    });

    const buildLevel = (entries, level, pathParts = []) => {
      const columnKey = groupingColumnKeys[level];
      const isLeafLevel = level === groupingColumnKeys.length - 1;
      const byGroup = new Map();
      entries.forEach((entry) => {
        const groupName = normalizeGroupLabel(entry.order?.values?.[columnKey], columnByKey[columnKey]);
        if (!byGroup.has(groupName)) {
          byGroup.set(groupName, []);
        }
        byGroup.get(groupName).push(entry);
      });

      const flatGroups = [];
      byGroup.forEach((bucketEntries, groupName) => {
        const nextPath = [...pathParts, `${columnKey}:${groupName}`];
        const groupKey = nextPath.join('||');
        const ancestorGroupKeys = pathParts.map((_, index) => pathParts.slice(0, index + 1).join('||'));
        flatGroups.push({
          groupKey,
          groupName,
          groupLabel: columnLabelByKey[columnKey] || columnKey || 'Category',
          groupColumnKey: columnKey,
          groupLevel: level,
          groupColor: pickColorByColumn(columnKey, groupingColorsByColumn),
          groupSummaries: buildGroupSummaries(bucketEntries),
          ancestorGroupKeys,
          entries: isLeafLevel ? bucketEntries : [],
          entriesForSelection: bucketEntries,
        });
        if (!isLeafLevel) {
          flatGroups.push(...buildLevel(bucketEntries, level + 1, nextPath));
        }
      });

      return flatGroups;
    };

    return buildLevel(safeRows, 0);
  }, [groupingColumnKeys, safeRows, columnLabelByKey, columnByKey, groupingColorsByColumn, summaryColumns]);

  const setGroupingColumn = useCallback((columnKey) => {
    const nextColumnKey = String(columnKey || '').trim();
    if (!nextColumnKey) return;
    setGroupingColumnKeys((current) => (current.includes(nextColumnKey) ? current : [...current, nextColumnKey]));
    setGroupingColorsByColumn((current) => {
      if (isHexColor(current?.[nextColumnKey])) return current;
      return {
        ...current,
        [nextColumnKey]: DEFAULT_GROUPING_COLOR,
      };
    });
  }, []);

  const clearGrouping = useCallback((columnKey) => {
    const targetColumnKey = String(columnKey || '').trim();
    if (!targetColumnKey) {
      setGroupingColumnKeys([]);
      return;
    }
    setGroupingColumnKeys((current) => current.filter((key) => key !== targetColumnKey));
  }, []);

  const setGroupingBarColor = useCallback((columnKeyOrValue, maybeValue) => {
    const value = maybeValue === undefined ? columnKeyOrValue : maybeValue;
    const targetColumnKey = maybeValue === undefined ? '' : String(columnKeyOrValue || '').trim();
    if (!isHexColor(value)) return;
    if (!targetColumnKey) {
      setGroupingColorsByColumn((current) => {
        if (!groupingColumnKeys.length) return current;
        const next = { ...current };
        groupingColumnKeys.forEach((key) => {
          next[key] = value;
        });
        return next;
      });
      return;
    }
    setGroupingColorsByColumn((current) => ({
      ...current,
      [targetColumnKey]: value,
    }));
  }, [groupingColumnKeys]);

  const setGroupSummaryColumn = useCallback((columnKey, enabled) => {
    const targetColumnKey = String(columnKey || '').trim();
    if (!targetColumnKey || !isNumberGroupingSummaryColumn(columnByKey[targetColumnKey])) return;
    setSummaryColumnKeys((current) => {
      const hasColumn = current.includes(targetColumnKey);
      if (enabled && !hasColumn) return [...current, targetColumnKey];
      if (!enabled && hasColumn) return current.filter((key) => key !== targetColumnKey);
      return current;
    });
  }, [columnByKey]);

  const clearGroupSummaries = useCallback(() => {
    setSummaryColumnKeys([]);
  }, []);

  const exportState = useCallback(() => {
    const activeColorsByColumn = groupingColumnKeys.reduce((acc, key) => {
      const color = pickColorByColumn(key, groupingColorsByColumn);
      if (isHexColor(color)) acc[key] = color;
      return acc;
    }, {});
    return {
      columnKeys: groupingColumnKeys,
      columnKey: groupingColumnKeys[0] || '',
      color: pickColorByColumn(groupingColumnKeys[0], groupingColorsByColumn),
      colorsByColumn: activeColorsByColumn,
      summaryColumnKeys,
    };
  }, [groupingColumnKeys, groupingColorsByColumn, summaryColumnKeys]);

  const applyState = useCallback((state) => {
    const keysFromState = dedupeKeys(state?.columnKeys?.length ? state?.columnKeys : state?.columnKey);
    const validKeys = keysFromState.filter((key) => safeColumns.some((column) => column.key === key));
    const stateColorsByColumn = (state?.colorsByColumn && typeof state.colorsByColumn === 'object')
      ? state.colorsByColumn
      : {};
    const validSummaryKeys = dedupeKeys(state?.summaryColumnKeys)
      .filter((key) => isNumberGroupingSummaryColumn(columnByKey[key]));
    const fallbackColor = isHexColor(state?.color) ? state.color : DEFAULT_GROUPING_COLOR;
    const nextColors = validKeys.reduce((acc, key) => {
      const ownColor = stateColorsByColumn[key];
      acc[key] = isHexColor(ownColor) ? ownColor : fallbackColor;
      return acc;
    }, {});
    setGroupingColumnKeys(validKeys);
    setSummaryColumnKeys(validSummaryKeys);
    setGroupingColorsByColumn((current) => ({ ...current, ...nextColors }));
  }, [safeColumns, columnByKey]);

  return useMemo(() => ({
    groupedRows,
    groupingColumnKey,
    groupingColumnKeys,
    groupingColumnLabel,
    groupingColor,
    groupingColorsByColumn,
    summaryColumnKeys,
    setGroupingColumn,
    clearGrouping,
    setGroupingBarColor,
    setGroupSummaryColumn,
    clearGroupSummaries,
    exportState,
    applyState,
  }), [
    groupedRows,
    groupingColumnKey,
    groupingColumnKeys,
    groupingColumnLabel,
    groupingColor,
    groupingColorsByColumn,
    summaryColumnKeys,
    setGroupingColumn,
    clearGrouping,
    setGroupingBarColor,
    setGroupSummaryColumn,
    clearGroupSummaries,
    exportState,
    applyState,
  ]);
}
