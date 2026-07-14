import { useCallback, useEffect, useRef, useState } from 'react';
import {
  findOrderGroupContext,
  orderLocateKeyFromPanelRow,
  ROW_LOCATE_HIGHLIGHT_MS,
} from '../utils/purchaseOrderRowLocate';

/**
 * Scrolls the board to a purchase order row and briefly highlights it.
 */
export function usePurchaseOrderRowLocate({
  groupedRows,
  collapsedGroups,
  ensureGroupsExpanded,
  tableWrapperRef,
  locateRequest,
}) {
  const [highlightedLocateKey, setHighlightedLocateKey] = useState(null);
  const pendingLocateKeyRef = useRef(null);
  const highlightTimerRef = useRef(null);

  const clearHighlightTimer = useCallback(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
  }, []);

  const scheduleHighlightClear = useCallback(() => {
    clearHighlightTimer();
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedLocateKey(null);
      highlightTimerRef.current = null;
    }, ROW_LOCATE_HIGHLIGHT_MS);
  }, [clearHighlightTimer]);

  const scrollToLocatedRow = useCallback((locateKey) => {
    const container = tableWrapperRef.current;
    if (!container || !locateKey) return false;

    const escapedKey = typeof CSS !== 'undefined' && CSS.escape
      ? CSS.escape(locateKey)
      : locateKey.replace(/"/g, '\\"');
    const rowEl = container.querySelector(`[data-locate-key="${escapedKey}"]`);
    if (!rowEl || typeof rowEl.scrollIntoView !== 'function') return false;

    rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setHighlightedLocateKey(locateKey);
    scheduleHighlightClear();
    return true;
  }, [scheduleHighlightClear, tableWrapperRef]);

  useEffect(() => {
    if (!locateRequest?.partitionKey || !locateRequest?.recordKey) return undefined;

    const locateKey = orderLocateKeyFromPanelRow(locateRequest);
    const context = findOrderGroupContext(groupedRows, locateKey);
    if (!context) return undefined;

    const needsExpand = context.keysToExpand.some((key) => collapsedGroups[key]);
    if (needsExpand) {
      pendingLocateKeyRef.current = locateKey;
      ensureGroupsExpanded(context.keysToExpand);
      return undefined;
    }

    pendingLocateKeyRef.current = null;
    const timer = setTimeout(() => scrollToLocatedRow(locateKey), 40);
    return () => clearTimeout(timer);
  }, [
    collapsedGroups,
    ensureGroupsExpanded,
    groupedRows,
    locateRequest,
    scrollToLocatedRow,
  ]);

  useEffect(() => {
    const pendingKey = pendingLocateKeyRef.current;
    if (!pendingKey) return undefined;

    const timer = setTimeout(() => {
      const found = scrollToLocatedRow(pendingKey);
      if (found) pendingLocateKeyRef.current = null;
    }, 120);

    return () => clearTimeout(timer);
  }, [collapsedGroups, groupedRows, scrollToLocatedRow]);

  useEffect(() => () => clearHighlightTimer(), [clearHighlightTimer]);

  return highlightedLocateKey;
}
