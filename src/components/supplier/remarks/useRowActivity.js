import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../../utils/api';
import { mergeNewest, mergeOlder } from './remarksFormatters';

const INITIAL_DELAY = 5000;
const MAX_DELAY = 60000;

function buildActivityPath({ tableKey, row, kind, columnId, cursor, afterCursor }) {
  const query = new URLSearchParams({
    partitionKey: row.partitionKey,
    recordKey: row.recordKey,
    kind,
    limit: '50',
  });
  if (columnId) query.set('columnId', String(columnId));
  if (cursor) query.set('cursor', cursor);
  if (afterCursor) query.set('afterCursor', afterCursor);
  return `/data/${encodeURIComponent(tableKey)}/activity?${query.toString()}`;
}

/**
 * Loads one cursor-paginated row activity feed and polls visible open drawers for deltas.
 */
export function useRowActivity({ enabled, tableKey, row, kind, columnId = null }) {
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ remarks: 0, history: 0 });
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const controllersRef = useRef(new Set());
  const newestCursorRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const timerRef = useRef(null);
  const backoffRef = useRef(INITIAL_DELAY);

  const request = useCallback(async (path) => {
    if (requestInFlightRef.current) {
      const busyError = new Error('An activity request is already in progress');
      busyError.code = 'REQUEST_IN_PROGRESS';
      throw busyError;
    }
    const controller = new AbortController();
    controllersRef.current.add(controller);
    requestInFlightRef.current = true;
    try {
      return await apiRequest(path, { signal: controller.signal });
    } finally {
      requestInFlightRef.current = false;
      controllersRef.current.delete(controller);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    if (!enabled || !tableKey || !row?.partitionKey || !row?.recordKey) return;
    setLoading(true);
    setError('');
    try {
      const data = await request(buildActivityPath({ tableKey, row, kind, columnId }));
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotals(data?.totals || { remarks: 0, history: 0 });
      setNextCursor(data?.nextCursor || null);
      newestCursorRef.current = data?.newestCursor || null;
      backoffRef.current = INITIAL_DELAY;
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') {
        setError(requestError?.message || 'Failed to load activity');
      }
    } finally {
      setLoading(false);
    }
  }, [columnId, enabled, kind, request, row, tableKey]);

  const loadOlder = useCallback(async () => {
    if (!nextCursor || requestInFlightRef.current) return;
    setError('');
    try {
      const data = await request(
        buildActivityPath({
          tableKey,
          row,
          kind,
          columnId,
          cursor: nextCursor,
        })
      );
      setItems((current) => mergeOlder(current, Array.isArray(data?.items) ? data.items : []));
      setTotals(data?.totals || totals);
      setNextCursor(data?.nextCursor || null);
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') {
        setError(requestError?.message || 'Failed to load older activity');
      }
    }
  }, [columnId, kind, nextCursor, request, row, tableKey, totals]);

  const retry = useCallback(() => {
    backoffRef.current = INITIAL_DELAY;
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    loadInitial();
    return () => {
      controllersRef.current.forEach((controller) => controller.abort());
      controllersRef.current.clear();
      requestInFlightRef.current = false;
    };
  }, [loadInitial]);

  useEffect(() => {
    if (!enabled) return undefined;
    let disposed = false;
    const clearTimer = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    const schedule = () => {
      clearTimer();
      if (!disposed && document.visibilityState === 'visible') {
        timerRef.current = window.setTimeout(poll, backoffRef.current);
      }
    };
    const poll = async () => {
      if (disposed || requestInFlightRef.current || document.visibilityState !== 'visible') {
        schedule();
        return;
      }
      if (!newestCursorRef.current) {
        schedule();
        return;
      }
      try {
        const data = await request(
          buildActivityPath({
            tableKey,
            row,
            kind,
            columnId,
            afterCursor: newestCursorRef.current,
          })
        );
        setItems((current) => mergeNewest(current, Array.isArray(data?.items) ? data.items : []));
        setTotals(data?.totals || { remarks: 0, history: 0 });
        newestCursorRef.current = data?.newestCursor || newestCursorRef.current;
        backoffRef.current = INITIAL_DELAY;
        setError('');
      } catch (requestError) {
        if (requestError?.name !== 'AbortError') {
          setError(requestError?.message || 'Failed to refresh activity');
          backoffRef.current = Math.min(backoffRef.current * 2, MAX_DELAY);
        }
      } finally {
        schedule();
      }
    };
    const handleVisibility = () => {
      clearTimer();
      if (document.visibilityState === 'visible') schedule();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    schedule();
    return () => {
      disposed = true;
      clearTimer();
      document.removeEventListener('visibilitychange', handleVisibility);
      controllersRef.current.forEach((controller) => controller.abort());
      controllersRef.current.clear();
      requestInFlightRef.current = false;
    };
  }, [columnId, enabled, kind, request, row, tableKey]);

  return useMemo(
    () => ({
      items,
      totals,
      loading,
      error,
      hasMore: Boolean(nextCursor),
      loadOlder,
      retry,
      refresh: loadInitial,
    }),
    [error, items, loadInitial, loadOlder, loading, nextCursor, retry, totals]
  );
}

export default useRowActivity;
