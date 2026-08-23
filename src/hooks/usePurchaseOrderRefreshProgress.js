import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';

const POLL_INTERVAL_MS = 1250;
const MAX_WAIT_MS = 15 * 60 * 1000;

/**
 * Pollt D365-refreshvoortgang. Admin-only: één check bij mount, daarna alleen
 * terwijl een run loopt. Hangt mee aan een Start vanuit Settings of night job.
 *
 * @param {{ enabled?: boolean, onAttachedRunFinishedRef?: { current: null | (() => void) } }} options
 * @returns {{ progress: object|null, run: object|null, running: boolean, startProgress: Function, finishProgress: Function, waitForCompletion: Function }}
 */
export function usePurchaseOrderRefreshProgress({ enabled = true, onAttachedRunFinishedRef } = {}) {
  const [progress, setProgress] = useState(null);
  const [run, setRun] = useState(null);
  const [running, setRunning] = useState(false);
  const lastKnownStateRef = useRef({ progress: null, run: null, running: false });
  const waitLoopRef = useRef(null);
  const mountedRef = useRef(true);

  const setKnownState = useCallback((nextProgress, nextRunning, nextRun = null) => {
    setProgress(nextProgress);
    setRun(nextRun);
    setRunning(nextRunning);
    lastKnownStateRef.current = {
      progress: nextProgress,
      run: nextRun,
      running: nextRunning,
    };
  }, []);

  const isProgressRateLimited = useCallback((err) => {
    const status = Number(err?.status);
    if (status === 429) return true;
    return /\b429\b/.test(String(err?.message || ''));
  }, []);

  const loadProgress = useCallback(async () => {
    if (!enabled) {
      return {
        running: lastKnownStateRef.current.running,
        progress: lastKnownStateRef.current.progress,
        run: lastKnownStateRef.current.run,
        rateLimited: false,
      };
    }
    try {
      const data = await apiRequest('/data/purchase-orders/refresh/progress');
      const nextProgress = data?.progress || null;
      const nextRun = data?.run || null;
      const nextRunning = Boolean(data?.running);
      setKnownState(nextProgress, nextRunning, nextRun);
      return {
        running: nextRunning,
        progress: nextProgress,
        run: nextRun,
        rateLimited: false,
      };
    } catch (err) {
      if (isProgressRateLimited(err)) {
        return {
          running: lastKnownStateRef.current.running,
          progress: lastKnownStateRef.current.progress,
          run: lastKnownStateRef.current.run,
          rateLimited: true,
        };
      }
      throw err;
    }
  }, [enabled, isProgressRateLimited, setKnownState]);

  const startProgress = useCallback(() => {
    setKnownState({
      status: 'fetching',
      fetched: 0,
      totalToFetch: null,
      saved: 0,
      totalToSave: null,
    }, true);
  }, [setKnownState]);

  const finishProgress = useCallback(async () => {
    try {
      await loadProgress();
    } catch {
      // Keep last known progress if the final poll fails.
    } finally {
      const last = lastKnownStateRef.current;
      setKnownState(last.progress, false, last.run);
    }
  }, [loadProgress, setKnownState]);

  const waitForCompletion = useCallback(async () => {
    if (waitLoopRef.current) return waitLoopRef.current;
    const loop = (async () => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < MAX_WAIT_MS) {
        if (!mountedRef.current) return lastKnownStateRef.current.progress;
        const state = await loadProgress();
        const status = String(state?.progress?.status || '').toLowerCase();
        if ((status === 'done' || status === 'error') && !state?.running) {
          setKnownState(state?.progress || null, false, state?.run || null);
          return state?.progress || null;
        }
        if (!state?.running && status !== 'fetching' && status !== 'saving') {
          setKnownState(state?.progress || null, false, state?.run || null);
          return state?.progress || null;
        }
        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
      }
      throw new Error('D365 refresh took too long and was stopped');
    })();
    waitLoopRef.current = loop;
    try {
      return await loop;
    } finally {
      waitLoopRef.current = null;
    }
  }, [loadProgress, setKnownState]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const state = await loadProgress();
        if (cancelled || !state.running) return;
        await waitForCompletion();
        if (!cancelled) onAttachedRunFinishedRef?.current?.();
      } catch {
        // Board stays usable if attach/poll fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, loadProgress, onAttachedRunFinishedRef, waitForCompletion]);

  return useMemo(() => ({
    progress,
    run,
    running,
    startProgress,
    finishProgress,
    waitForCompletion,
  }), [progress, run, running, startProgress, finishProgress, waitForCompletion]);
}
