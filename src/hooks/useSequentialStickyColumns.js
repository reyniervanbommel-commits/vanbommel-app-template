import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

const CONTROL_COLUMN_WIDTH = 58;
const FALLBACK_COLUMN_WIDTH = 80;

function pickColumnWidth(columnKey, explicitWidths, measuredWidths) {
  const explicit = Number(explicitWidths?.[columnKey]);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const measured = Number(measuredWidths?.[columnKey]);
  if (Number.isFinite(measured) && measured > 0) return measured;
  return FALLBACK_COLUMN_WIDTH;
}

function offsetsShallowEqual(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

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
  const [measuredOffsetsByKey, setMeasuredOffsetsByKey] = useState({});
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

  // Fallback offsets op basis van geschatte content-breedtes. Alleen gebruikt
  // vóórdat de echte DOM-breedtes (incl. padding + border) gemeten zijn.
  const fallbackOffsetsByKey = useMemo(() => {
    const offsets = {};
    let left = CONTROL_COLUMN_WIDTH;
    stickyColumnKeys.forEach((key) => {
      offsets[key] = left;
      left += pickColumnWidth(key, headerColumnWidths, measuredStickyWidths);
    });
    return offsets;
  }, [stickyColumnKeys, headerColumnWidths, measuredStickyWidths]);

  // Meet de werkelijke render-breedtes (border-box, dus incl. padding + border)
  // van de control-kolom en elke sticky-kolom, en tel ze cumulatief op tot
  // exacte left-offsets. Breedtes zijn ongevoelig voor scroll/sticky, dus dit
  // geeft geen feedback-loop.
  const measureOffsets = useCallback(() => {
    const container = wrapperRef.current;
    const head = container?.querySelector('thead');
    if (!head) return;
    const controlCell = head.querySelector('th');
    const controlWidth = controlCell?.getBoundingClientRect?.().width;
    let left = Number.isFinite(controlWidth) && controlWidth > 0
      ? controlWidth
      : CONTROL_COLUMN_WIDTH;
    const next = {};
    for (const key of stickyColumnKeys) {
      next[key] = left;
      const cell = head.querySelector(`[data-col-key="${key}"]`);
      const width = cell?.getBoundingClientRect?.().width;
      if (!Number.isFinite(width) || width <= 0) return; // DOM nog niet klaar; volgende meting corrigeert
      left += width;
    }
    setMeasuredOffsetsByKey((current) => (offsetsShallowEqual(current, next) ? current : next));
  }, [stickyColumnKeys, wrapperRef]);

  useLayoutEffect(() => {
    measureOffsets();
    const table = wrapperRef.current?.querySelector('table');
    if (!table || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => measureOffsets());
    observer.observe(table);
    return () => observer.disconnect();
  }, [measureOffsets, headerColumnWidths, safeColumns, wrapperRef]);

  const decoratedColumns = useMemo(
    () => safeColumns.map((column) => {
      const stickyLeft = Number.isFinite(measuredOffsetsByKey[column.key])
        ? measuredOffsetsByKey[column.key]
        : fallbackOffsetsByKey[column.key];
      if (!Number.isFinite(stickyLeft)) return column;
      return { ...column, stickyLeft };
    }),
    [safeColumns, measuredOffsetsByKey, fallbackOffsetsByKey]
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
