import { useCallback, useEffect, useMemo, useState } from 'react';

const CONTROL_COLUMN_WIDTH = 58;
const FALLBACK_COLUMN_WIDTH = 80;

function pickColumnWidth(columnKey, explicitWidths, measuredWidths) {
  const explicit = Number(explicitWidths?.[columnKey]);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const measured = Number(measuredWidths?.[columnKey]);
  if (Number.isFinite(measured) && measured > 0) return measured;
  return FALLBACK_COLUMN_WIDTH;
}

export function useSequentialStickyColumns({ columns, headerColumnWidths, wrapperRef }) {
  const safeColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);
  const [stickyColumnKeys, setStickyColumnKeys] = useState([]);
  const [measuredStickyWidths, setMeasuredStickyWidths] = useState({});

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

  const stickyOffsetsByKey = useMemo(() => {
    const offsets = {};
    let left = CONTROL_COLUMN_WIDTH;
    stickyColumnKeys.forEach((key) => {
      offsets[key] = left;
      left += pickColumnWidth(key, headerColumnWidths, measuredStickyWidths);
    });
    return offsets;
  }, [stickyColumnKeys, headerColumnWidths, measuredStickyWidths]);

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
