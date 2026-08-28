import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function sameKeys(left, right) {
  return left === right
    || (left.length === right.length && left.every((key, index) => key === right[index]));
}

/**
 * Board-wide header column sums (footer), independent of grouping summaries.
 * Input: filtered board rows + column definitions.
 * Output: selected keys, setter, summed values, and saved-view export/apply.
 */
export function usePurchaseOrderColumnSums({ rows, columns }) {
  const [columnSumKeys, setColumnSumKeys] = useState(EMPTY_KEYS);
  const columnSumKeysRef = useRef(columnSumKeys);
  const columnByKey = useMemo(() => {
    const map = {};
    (Array.isArray(columns) ? columns : []).forEach((column) => {
      if (column?.key) map[column.key] = column;
    });
    return map;
  }, [columns]);

  const sanitizeKeys = useCallback((keys) => {
    const next = [];
    const catalogReady = Object.keys(columnByKey).length > 0;
    (Array.isArray(keys) ? keys : []).forEach((rawKey) => {
      if (!isSafeColumnKey(rawKey)) return;
      const key = String(rawKey).trim();
      if (next.includes(key)) return;
      const column = columnByKey[key];
      if (column) {
        if (!isSummableHeaderColumn(column)) return;
        next.push(key);
        return;
      }
      if (!catalogReady) next.push(key);
    });
    return next.length ? next : EMPTY_KEYS;
  }, [columnByKey]);

  const commitKeys = useCallback((next) => {
    columnSumKeysRef.current = next;
    setColumnSumKeys(next);
  }, []);

  const setColumnSumColumn = useCallback((columnKey, enabled) => {
    if (!isSafeColumnKey(columnKey) || !isSummableHeaderColumn(columnByKey[columnKey])) return;
    const key = String(columnKey).trim();
    setColumnSumKeys((current) => {
      const hasKey = current.includes(key);
      let next = current;
      if (enabled && !hasKey) next = [...current, key];
      else if (!enabled && hasKey) next = current.filter((entry) => entry !== key);
      const resolved = next.length ? next : EMPTY_KEYS;
      columnSumKeysRef.current = resolved;
      return resolved;
    });
  }, [columnByKey]);

  const clearColumnSums = useCallback(() => {
    commitKeys(EMPTY_KEYS);
  }, [commitKeys]);

  const applyKeys = useCallback((keys) => {
    commitKeys(sanitizeKeys(keys));
  }, [commitKeys, sanitizeKeys]);

  useEffect(() => {
    setColumnSumKeys((current) => {
      if (!current.length) return current;
      const next = sanitizeKeys(current);
      if (sameKeys(next, current)) return current;
      columnSumKeysRef.current = next;
      return next;
    });
  }, [sanitizeKeys]);

  const exportKeys = useCallback(() => columnSumKeysRef.current, []);

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
