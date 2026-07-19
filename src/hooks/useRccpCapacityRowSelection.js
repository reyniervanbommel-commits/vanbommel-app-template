import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Spreadsheet-style row selection with Ctrl/Cmd toggle and Shift range select.
 * @param {Array<{ localKey: string }>} visibleRows Rows currently shown in the grid.
 */
export function useRccpCapacityRowSelection(visibleRows) {
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const anchorRef = useRef(null);
  const visibleKeyList = useMemo(
    () => visibleRows.map((row) => row.localKey),
    [visibleRows],
  );

  useEffect(() => {
    setSelectedKeys((prev) => {
      const visible = new Set(visibleKeyList);
      const next = new Set([...prev].filter((key) => visible.has(key)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleKeyList]);

  const toggleRowSelection = useCallback((localKey, event) => {
    const multi = event.ctrlKey || event.metaKey;
    const range = event.shiftKey;

    setSelectedKeys((prev) => {
      if (range && anchorRef.current) {
        const start = visibleKeyList.indexOf(anchorRef.current);
        const end = visibleKeyList.indexOf(localKey);
        if (start >= 0 && end >= 0) {
          const [from, to] = start < end ? [start, end] : [end, start];
          const slice = visibleKeyList.slice(from, to + 1);
          return multi ? new Set([...prev, ...slice]) : new Set(slice);
        }
      }

      if (multi) {
        const next = new Set(prev);
        if (next.has(localKey)) next.delete(localKey);
        else next.add(localKey);
        anchorRef.current = localKey;
        return next;
      }

      anchorRef.current = localKey;
      return new Set([localKey]);
    });
  }, [visibleKeyList]);

  const toggleSelectAll = useCallback((checked) => {
    setSelectedKeys(checked ? new Set(visibleKeyList) : new Set());
    anchorRef.current = visibleKeyList[0] ?? null;
  }, [visibleKeyList]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
    anchorRef.current = null;
  }, []);

  const allVisibleSelected = visibleKeyList.length > 0
    && visibleKeyList.every((key) => selectedKeys.has(key));
  const someVisibleSelected = visibleKeyList.some((key) => selectedKeys.has(key));

  return {
    selectedKeys,
    selectedCount: selectedKeys.size,
    allVisibleSelected,
    someVisibleSelected,
    toggleRowSelection,
    toggleSelectAll,
    clearSelection,
  };
}
