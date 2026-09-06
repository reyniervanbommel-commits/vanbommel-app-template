import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeChartVisibleKeys } from '../components/rccp/rccpMatrixRows';

/**
 * Which measure rows are toggled on in the chart/matrix, hydrated once from the saved
 * board-setting keys and kept in sync when new rows appear.
 *
 * @param {{ orderedRows: Array, visibility?: { ready?: boolean, savedKeys?: object, onChange?: Function } }} input
 * @returns {{ visibleKeys: object, handleToggle: (measureKey: string, checked: boolean) => void }}
 */
export function useRccpChartVisibility({ orderedRows, visibility = null }) {
  const [visibleKeys, setVisibleKeys] = useState({});
  const hydratedRef = useRef(false);

  useEffect(() => {
    const ready = !visibility || visibility.ready !== false;
    if (!ready) {
      hydratedRef.current = false;
      setVisibleKeys(mergeChartVisibleKeys(orderedRows, {}, {}));
      return;
    }
    const preferStored = Boolean(visibility) && !hydratedRef.current;
    hydratedRef.current = true;
    setVisibleKeys((prev) => mergeChartVisibleKeys(
      orderedRows,
      prev,
      visibility?.savedKeys || {},
      { preferStored },
    ));
  }, [orderedRows, visibility, visibility?.savedKeys, visibility?.ready]);

  const handleToggle = useCallback((measureKey, checked) => {
    setVisibleKeys((prev) => {
      const next = { ...prev, [measureKey]: checked };
      visibility?.onChange?.(next);
      return next;
    });
  }, [visibility]);

  return { visibleKeys, handleToggle };
}
