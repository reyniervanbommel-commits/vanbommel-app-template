import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  areStickyOffsetsComplete,
  computeStickyOffsetsFromWidths,
  measureStickyOffsetsFromTable,
} from '../utils/purchaseOrderStickyColumnOffsets';

export function useSequentialStickyColumns({
  columns,
  headerColumnWidths,
  wrapperRef,
  stickyColumnKeys: controlledStickyColumnKeys,
  onStickyColumnKeysChange,
}) {
  const safeColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);
  const [uncontrolledStickyColumnKeys, setUncontrolledStickyColumnKeys] = useState([]);
  const [measuredStickyWidths, setMeasuredStickyWidths] = useState({});
  const [measuredStickyOffsets, setMeasuredStickyOffsets] = useState({});
  const stickyColumnKeys = Array.isArray(controlledStickyColumnKeys)
    ? controlledStickyColumnKeys
    : uncontrolledStickyColumnKeys;
  const setStickyColumnKeys = onStickyColumnKeysChange || setUncontrolledStickyColumnKeys;

  useEffect(() => {
    setStickyColumnKeys((current) => {
      const activeSet = new Set(current);
      const next = [];
      for (const column of safeColumns) {
        if (!activeSet.has(column.key)) break;
        next.push(column.key);
      }
      return next;
    });
    setMeasuredStickyWidths((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => safeColumns.some((column) => column.key === key))
    ));
  }, [safeColumns]);

  const firstNonStickyColumnKey = useMemo(
    () => safeColumns[stickyColumnKeys.length]?.key || '',
    [safeColumns, stickyColumnKeys]
  );
  const lastStickyColumnKey = useMemo(
    () => stickyColumnKeys[stickyColumnKeys.length - 1] || '',
    [stickyColumnKeys]
  );

  const fallbackStickyOffsets = useMemo(
    () => computeStickyOffsetsFromWidths(stickyColumnKeys, headerColumnWidths, measuredStickyWidths),
    [stickyColumnKeys, headerColumnWidths, measuredStickyWidths]
  );

  useLayoutEffect(() => {
    const wrapper = wrapperRef?.current;
    if (!wrapper || !stickyColumnKeys.length) {
      setMeasuredStickyOffsets({});
      return undefined;
    }

    let frame = 0;
    const measureOffsets = () => {
      const table = wrapper.querySelector('table');
      const nextOffsets = measureStickyOffsetsFromTable(table, stickyColumnKeys);
      if (!nextOffsets) return;
      setMeasuredStickyOffsets((current) => {
        const changed = stickyColumnKeys.some((key) => current[key] !== nextOffsets[key]);
        return changed ? nextOffsets : current;
      });
    };

    const scheduleMeasure = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measureOffsets();
      });
    };

    scheduleMeasure();
    const table = wrapper.querySelector('table');
    if (!table) return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(table);
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [stickyColumnKeys, headerColumnWidths, wrapperRef]);

  const stickyOffsetsByKey = useMemo(() => {
    if (areStickyOffsetsComplete(measuredStickyOffsets, stickyColumnKeys)) {
      return measuredStickyOffsets;
    }
    return fallbackStickyOffsets;
  }, [fallbackStickyOffsets, measuredStickyOffsets, stickyColumnKeys]);

  const decoratedColumns = useMemo(
    () => safeColumns.map((column) => {
      const stickyLeft = stickyOffsetsByKey[column.key];
      if (!Number.isFinite(stickyLeft)) return column;
      return { ...column, stickyLeft };
    }),
    [safeColumns, stickyOffsetsByKey]
  );

  const makeColumnSticky = useCallback((columnKey) => {
    const key = String(columnKey || '').trim();
    if (!key) return false;
    if (key === firstNonStickyColumnKey) {
      const measuredWidth = wrapperRef.current?.querySelector(`[data-col-key="${key}"]`)?.getBoundingClientRect?.().width;
      if (Number.isFinite(measuredWidth) && measuredWidth > 0) {
        setMeasuredStickyWidths((current) => ({ ...current, [key]: Math.round(measuredWidth) }));
      }
      setStickyColumnKeys((current) => (current.includes(key) ? current : [...current, key]));
      return true;
    }
    if (key === lastStickyColumnKey) {
      setStickyColumnKeys((current) => current.slice(0, -1));
      setMeasuredStickyWidths((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return true;
    }
    return false;
  }, [firstNonStickyColumnKey, lastStickyColumnKey, wrapperRef]);

  return {
    decoratedColumns,
    stickyColumnKeys,
    firstNonStickyColumnKey,
    makeColumnSticky,
  };
}
