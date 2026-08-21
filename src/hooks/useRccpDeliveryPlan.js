import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { subscribeRccpSettingsSaved } from './rccpSettingsSync';
import { usePageActive } from './usePageActive';
import { useBoardRevisionGate } from './useBoardRevisionGate';

function buildDeliveryPlanQuery(window, vendorAccount) {
  const params = new URLSearchParams({
    fromYear: String(window.fromYear),
    fromWeek: String(window.fromWeek),
    toYear: String(window.toYear),
    toWeek: String(window.toWeek),
  });
  if (vendorAccount) params.set('vendorAccount', vendorAccount);
  return `/rccp/delivery-plan?${params.toString()}`;
}

/**
 * Laadt GET /rccp/delivery-plan alleen als de tab actief is en een vendor gekozen is.
 */
export function useRccpDeliveryPlan({
  vendorAccount = '',
  window,
  windowLoaded = false,
  enabled = false,
} = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const fromYear = window?.fromYear;
  const fromWeek = window?.fromWeek;
  const toYear = window?.toYear;
  const toWeek = window?.toWeek;

  const load = useCallback(async () => {
    if (!windowLoaded || !enabled) {
      requestIdRef.current += 1;
      setData(null);
      setError('');
      setLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest(buildDeliveryPlanQuery(
        { fromYear, fromWeek, toYear, toWeek },
        vendorAccount || undefined,
      ));
      if (requestId !== requestIdRef.current) return;
      setData(payload);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Failed to load delivery plan');
      setData(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, vendorAccount, fromYear, fromWeek, toYear, toWeek, windowLoaded]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeRccpSettingsSaved(() => { load(); }), [load]);

  const pageActive = usePageActive();
  const seenRevisionRef = useRef(null);
  const handleRevision = useCallback((rev) => {
    if (!rev) return;
    if (seenRevisionRef.current === null) {
      seenRevisionRef.current = rev;
      return;
    }
    if (rev !== seenRevisionRef.current) {
      seenRevisionRef.current = rev;
      load();
    }
  }, [load]);
  useBoardRevisionGate({ active: pageActive && enabled, onRevision: handleRevision, runOnMount: true });

  return { data, loading, error, reload: load };
}
