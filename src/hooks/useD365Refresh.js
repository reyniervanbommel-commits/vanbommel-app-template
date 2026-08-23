import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';

const POLL_INTERVAL_MS = 1250;

/**
 * Live D365-refresh voor Settings: start + progress-poll, historie eenmaal.
 * Input: geen.
 * Output: live-state, historie, alert-emails en handlers.
 */
export function useD365Refresh() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [run, setRun] = useState(null);
  const [history, setHistory] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingEmails, setSavingEmails] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const historyLoadedRef = useRef(false);
  const prevRunningRef = useRef(false);

  const applyLive = useCallback((data) => {
    setRunning(Boolean(data?.running));
    setProgress(data?.progress || null);
    setRun(data?.run || null);
  }, []);

  const loadHistory = useCallback(async () => {
    const data = await apiRequest('/admin/d365-refresh/runs?limit=20');
    setHistory(Array.isArray(data?.runs) ? data.runs : []);
    historyLoadedRef.current = true;
  }, []);

  const loadLive = useCallback(async () => {
    const data = await apiRequest('/data/purchase-orders/refresh/progress?view=full');
    applyLive(data);
    return data;
  }, [applyLive]);

  const loadEmails = useCallback(async () => {
    const data = await apiRequest('/admin/d365-refresh/alert-emails');
    setEmails(Array.isArray(data?.emails) ? data.emails : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadLive(), loadHistory(), loadEmails()]);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load D365 refresh');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadEmails, loadHistory, loadLive]);

  useEffect(() => {
    if (!running) {
      if (prevRunningRef.current && historyLoadedRef.current) {
        loadHistory().catch(() => {});
      }
      prevRunningRef.current = false;
      return undefined;
    }
    prevRunningRef.current = true;
    const timer = window.setInterval(() => {
      loadLive().catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadHistory, loadLive, running]);

  const startRefresh = useCallback(async () => {
    setStarting(true);
    setError('');
    setFeedback('');
    try {
      await apiRequest('/data/purchase-orders/refresh/start', { method: 'POST' });
      await loadLive();
    } catch (err) {
      setError(err?.message || 'Failed to start D365 refresh');
    } finally {
      setStarting(false);
    }
  }, [loadLive]);

  const saveEmails = useCallback(async (nextEmails) => {
    const payload = Array.isArray(nextEmails) ? nextEmails : emails;
    setSavingEmails(true);
    setError('');
    setFeedback('');
    try {
      const data = await apiRequest('/admin/d365-refresh/alert-emails', {
        method: 'PUT',
        body: { emails: payload },
      });
      setEmails(Array.isArray(data?.emails) ? data.emails : payload);
      setFeedback('Alert emails saved');
    } catch (err) {
      setError(err?.message || 'Failed to save alert emails');
    } finally {
      setSavingEmails(false);
    }
  }, [emails]);

  const setEmailsValue = useCallback((value) => {
    setEmails(Array.isArray(value) ? value : []);
  }, []);

  return useMemo(() => ({
    running,
    progress,
    run,
    history,
    emails,
    loading,
    savingEmails,
    starting,
    error,
    feedback,
    startRefresh,
    saveEmails,
    setEmails: setEmailsValue,
  }), [
    emails,
    error,
    feedback,
    history,
    loading,
    progress,
    run,
    running,
    saveEmails,
    savingEmails,
    setEmailsValue,
    startRefresh,
    starting,
  ]);
}
