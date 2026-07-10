import { useCallback, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';

const POLL_INTERVAL_MS = 1250;
const MAX_WAIT_MS = 15 * 60 * 1000;

/**
 * Pollt de server-side D365 refreshvoortgang.
 *
 * Input: geen.
 * Output: progress, startProgress, finishProgress.
 */
export function usePurchaseOrderRefreshProgress() {
  const [progress, setProgress] = useState(null);
  const [running, setRunning] = useState(false);
  const lastKnownStateRef = useRef({ progress: null, running: false });

  const setKnownState = useCallback((nextProgress, nextRunning) => {
    setProgress(nextProgress);
    setRunning(nextRunning);
    lastKnownStateRef.current = {
      progress: nextProgress,
      running: nextRunning,
    };
  }, []);

  const isProgressRateLimited = useCallback((err) => {
    const status = Number(err?.status);
    if (status === 429) return true;
    return /\b429\b/.test(String(err?.message || ''));
  }, []);

  const loadProgress = useCallback(async () => {
    try {
      const data = await apiRequest('/data/purchase-orders/refresh/progress');
      const nextProgress = data?.progress || null;
      const nextRunning = Boolean(data?.running);
      setKnownState(nextProgress, nextRunning);
      return {
        running: nextRunning,
        progress: nextProgress,
        rateLimited: false,
      };
    } catch (err) {
      if (isProgressRateLimited(err)) {
        return {
          running: lastKnownStateRef.current.running,
          progress: lastKnownStateRef.current.progress,
          rateLimited: true,
        };
      }
      throw err;
    }
  }, [isProgressRateLimited, setKnownState]);

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
      // Laat de laatst bekende voortgang staan als de eindpoll faalt.
    } finally {
      const last = lastKnownStateRef.current;
      setKnownState(last.progress, false);
    }
  }, [loadProgress, setKnownState]);

  const waitForCompletion = useCallback(async () => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < MAX_WAIT_MS) {
      const state = await loadProgress();
      const status = String(state?.progress?.status || '').toLowerCase();
      if ((status === 'done' || status === 'error') && !state?.running) {
        setKnownState(state?.progress || null, false);
        return state?.progress || null;
      }
      if (!state?.running && status !== 'fetching' && status !== 'saving') {
        setKnownState(state?.progress || null, false);
        return state?.progress || null;
      }
      await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
    }
    throw new Error('D365 refresh duurde te lang en is afgebroken');
  }, [loadProgress, setKnownState]);

  return useMemo(() => ({
    progress,
    running,
    startProgress,
    finishProgress,
    waitForCompletion,
  }), [progress, running, startProgress, finishProgress, waitForCompletion]);
}
