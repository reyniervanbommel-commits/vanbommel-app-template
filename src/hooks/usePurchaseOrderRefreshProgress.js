import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

const POLL_INTERVAL_MS = 750;
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
  const [polling, setPolling] = useState(false);

  const loadProgress = useCallback(async () => {
    const data = await apiRequest('/data/purchase-orders/refresh/progress');
    const nextProgress = data?.progress || null;
    const nextRunning = Boolean(data?.running);
    setProgress(nextProgress);
    setRunning(nextRunning);
    return {
      running: nextRunning,
      progress: nextProgress,
    };
  }, []);

  useEffect(() => {
    if (!polling) return undefined;
    let stopped = false;
    let timer = null;

    const tick = async () => {
      try {
        await loadProgress();
      } catch {
        // Polling is ondersteunend; de refresh-call zelf toont de echte foutmelding.
      }
      if (!stopped) {
        timer = window.setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    tick();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [loadProgress, polling]);

  const startProgress = useCallback(() => {
    setProgress({
      status: 'fetching',
      fetched: 0,
      totalToFetch: null,
      saved: 0,
      totalToSave: null,
    });
    setPolling(true);
  }, []);

  const finishProgress = useCallback(async () => {
    try {
      await loadProgress();
    } catch {
      // Laat de laatst bekende voortgang staan als de eindpoll faalt.
    } finally {
      setPolling(false);
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
