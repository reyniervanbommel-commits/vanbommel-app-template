import { useCallback, useMemo, useState } from 'react';
import {
  calculateHeaderColumnSums,
  isSummableHeaderColumn,
} from '../utils/purchaseOrderTotals';

const RESERVED_COLUMN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const EMPTY_KEYS = [];
const EMPTY_SUMS = {};

function isSafeColumnKey(key) {
  const normalized = String(key || '').trim();
  return Boolean(normalized) && !RESERVED_COLUMN_KEYS.has(normalized);
}

/**
 * Board-wide header column sums (footer), independent of grouping summaries.
 * Input: filtered board rows + column definitions.
 * Output: selected keys, setter, summed values, and saved-view export/apply.
 */
export function usePurchaseOrderColumnSums({ rows, columns }) {
  const [columnSumKeys, setColumnSumKeys] = useState(EMPTY_KEYS);
  const columnByKey = useMemo(() => {
    const map = {};
    (Array.isArray(columns) ? columns : []).forEach((column) => {
      if (column?.key) map[column.key] = column;
    });
    return map;
  }, [columns]);

  const sanitizeKeys = useCallback((keys) => {
    const next = [];
    (Array.isArray(keys) ? keys : []).forEach((rawKey) => {
      if (!isSafeColumnKey(rawKey)) return;
      const key = String(rawKey).trim();
      if (next.includes(key)) return;
      if (!isSummableHeaderColumn(columnByKey[key])) return;
      next.push(key);
    });
    return next.length ? next : EMPTY_KEYS;
  }, [columnByKey]);

  const setColumnSumColumn = useCallback((columnKey, enabled) => {
    if (!isSafeColumnKey(columnKey) || !isSummableHeaderColumn(columnByKey[columnKey])) return;
    const key = String(columnKey).trim();
    setColumnSumKeys((current) => {
      const hasKey = current.includes(key);
      if (enabled && !hasKey) return [...current, key];
      if (!enabled && hasKey) {
        const next = current.filter((entry) => entry !== key);
        return next.length ? next : EMPTY_KEYS;
      }
      return current;
    });
  }, [columnByKey]);

  const clearColumnSums = useCallback(() => {
    setColumnSumKeys(EMPTY_KEYS);
  }, []);

  const applyKeys = useCallback((keys) => {
    setColumnSumKeys(sanitizeKeys(keys));
  }, [sanitizeKeys]);

  const exportKeys = useCallback(() => columnSumKeys, [columnSumKeys]);

  const summedValuesByColumn = useMemo(() => {
    if (!columnSumKeys.length) return EMPTY_SUMS;
    return calculateHeaderColumnSums(rows, columnSumKeys);
  }, [columnSumKeys, rows]);

  return useMemo(() => ({
    columnSumKeys,
    setColumnSumColumn,
    clearColumnSums,
    summedValuesByColumn,
    exportKeys,
    applyKeys,
  }), [
    applyKeys,
    clearColumnSums,
    columnSumKeys,
    exportKeys,
    setColumnSumColumn,
    summedValuesByColumn,
  ]);
}
