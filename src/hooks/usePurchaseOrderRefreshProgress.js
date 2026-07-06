import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

const POLL_INTERVAL_MS = 750;

/**
 * Pollt de server-side D365 refreshvoortgang.
 *
 * Input: geen.
 * Output: progress, startProgress, finishProgress.
 */
export function usePurchaseOrderRefreshProgress() {
  const [progress, setProgress] = useState(null);
  const [polling, setPolling] = useState(false);

  const loadProgress = useCallback(async () => {
    const data = await apiRequest('/data/purchase-orders/refresh/progress');
    setProgress(data?.progress || null);
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

  return useMemo(() => ({
    progress,
    startProgress,
    finishProgress,
  }), [progress, startProgress, finishProgress]);
}
