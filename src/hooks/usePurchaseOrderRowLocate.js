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
  const pendingLocateSeqRef = useRef(null);
  const lastHandledLocateSeqRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const groupedRowsRef = useRef(groupedRows);
  const collapsedGroupsRef = useRef(collapsedGroups);

  groupedRowsRef.current = groupedRows;
  collapsedGroupsRef.current = collapsedGroups;

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

  const completePendingLocate = useCallback((locateKey, seq) => {
    pendingLocateKeyRef.current = null;
    pendingLocateSeqRef.current = null;
    lastHandledLocateSeqRef.current = seq;
    scrollToLocatedRow(locateKey);
  }, [scrollToLocatedRow]);

  useEffect(() => {
    const seq = locateRequest?.seq;
    if (!locateRequest?.partitionKey || !locateRequest?.recordKey || !seq) return undefined;
    if (seq === lastHandledLocateSeqRef.current) return undefined;

    const locateKey = orderLocateKeyFromPanelRow(locateRequest);
    const context = findOrderGroupContext(groupedRowsRef.current, locateKey);

    pendingLocateSeqRef.current = seq;

    if (!context) {
      pendingLocateKeyRef.current = locateKey;
      return undefined;
    }

    const needsExpand = context.keysToExpand.some((key) => collapsedGroupsRef.current[key]);
    if (needsExpand) {
      pendingLocateKeyRef.current = locateKey;
      ensureGroupsExpanded(context.keysToExpand);
      return undefined;
    }

    const timer = setTimeout(() => completePendingLocate(locateKey, seq), 40);
    return () => clearTimeout(timer);
  }, [
    completePendingLocate,
    ensureGroupsExpanded,
    locateRequest?.partitionKey,
    locateRequest?.recordKey,
    locateRequest?.seq,
  ]);

  useEffect(() => {
    const pendingKey = pendingLocateKeyRef.current;
    const pendingSeq = pendingLocateSeqRef.current;
    if (!pendingKey || !pendingSeq) return undefined;
    if (pendingSeq === lastHandledLocateSeqRef.current) return undefined;

    const context = findOrderGroupContext(groupedRows, pendingKey);
    if (!context) return undefined;

    const needsExpand = context.keysToExpand.some((key) => collapsedGroups[key]);
    if (needsExpand) return undefined;

    const timer = setTimeout(() => completePendingLocate(pendingKey, pendingSeq), 120);
    return () => clearTimeout(timer);
  }, [collapsedGroups, completePendingLocate, groupedRows]);

  useEffect(() => () => clearHighlightTimer(), [clearHighlightTimer]);

  return highlightedLocateKey;
}
