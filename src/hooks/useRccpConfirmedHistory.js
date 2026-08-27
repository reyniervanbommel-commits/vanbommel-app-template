import { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';

function historyQuery(itemNumber, vendorAccount, window) {
  const params = new URLSearchParams({
    itemNumber,
    fromYear: String(window.fromYear),
    fromWeek: String(window.fromWeek),
    toYear: String(window.toYear),
    toWeek: String(window.toWeek),
  });
  if (vendorAccount) params.set('vendorAccount', vendorAccount);
  return `/rccp/confirmed-history?${params.toString()}`;
}

/**
 * Fetch confirmed-date versions for a pinned RCCP item.
 * @param {{ itemNumber: string, vendorAccount: string, window: object, enabled: boolean }} args
 * @returns {{ versions: { at: string, date: string }[], loading: boolean, error: string }}
 */
export function useRccpConfirmedHistory({
  itemNumber = '', vendorAccount = '', window, enabled = false,
} = {}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sku = String(itemNumber || '').trim();
    if (!enabled || !sku || !window) {
      setVersions([]);
      setLoading(false);
      setError('');
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiRequest(historyQuery(sku, vendorAccount, window))
      .then((data) => {
        if (controller.signal.aborted) return;
        setVersions(Array.isArray(data?.versions) ? data.versions : []);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.message || 'Failed to load confirmed history');
        setVersions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [itemNumber, vendorAccount, window, enabled]);

  return { versions, loading, error };
}
