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
  const latestStateRef = useRef({ running: false, progress: null });

  const applyProgressState = useCallback((nextState) => {
    setProgress(nextState.progress);
    setRunning(nextState.running);
    latestStateRef.current = nextState;
    return nextState;
  }, []);

  const loadProgress = useCallback(async () => {
    try {
      const data = await apiRequest('/data/purchase-orders/refresh/progress');
      const nextState = {
        running: Boolean(data?.running),
        progress: data?.progress || null,
      };
      return applyProgressState(nextState);
    } catch (err) {
      if (err?.status === 429) {
        // Bij tijdelijke throttling houden we de laatste bekende status aan
        // en laten we de polling-loop doorlopen.
        return latestStateRef.current;
      }
      throw err;
    }
  }, [applyProgressState]);

  const startProgress = useCallback(() => {
    applyProgressState({
      running: true,
      progress: {
        status: 'fetching',
        fetched: 0,
        totalToFetch: null,
        saved: 0,
        totalToSave: null,
      },
    });
  }, [applyProgressState]);

  const finishProgress = useCallback(async () => {
    try {
      await loadProgress();
    } catch {
      // Laat de laatst bekende voortgang staan als de eindpoll faalt.
    } finally {
      setRunning(false);
      latestStateRef.current = {
        ...latestStateRef.current,
        running: false,
      };
    }
  }, [loadProgress]);

  const waitForCompletion = useCallback(async () => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < MAX_WAIT_MS) {
      const state = await loadProgress();
      const status = String(state?.progress?.status || '').toLowerCase();
      if ((status === 'done' || status === 'error') && !state?.running) {
        return state?.progress || null;
      }
      if (!state?.running && status !== 'fetching' && status !== 'saving') {
        return state?.progress || null;
      }
      await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
    }
    throw new Error('D365 refresh duurde te lang en is afgebroken');
  }, [loadProgress]);

  return useMemo(() => ({
    progress,
    running,
    startProgress,
    finishProgress,
    waitForCompletion,
  }), [progress, running, startProgress, finishProgress, waitForCompletion]);
}
