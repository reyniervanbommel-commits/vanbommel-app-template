import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

/**
 * Admin-hook voor PO-boardkolommen van Product attribute values.
 * Input: enabled (boolean) — fetch alleen als de PAV-tab actief is.
 * Output: names, loading, error, togglingName, setVisible.
 */
export function useProductAttributeBoardColumns(enabled) {
  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [togglingName, setTogglingName] = useState('');

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    apiRequest('/data/product-attribute-values/board-columns')
      .then((data) => {
        if (cancelled) return;
        setNames(Array.isArray(data?.names) ? data.names : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load attribute names');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [enabled]);

  const setVisible = useCallback(async (attributeName, visible) => {
    setTogglingName(attributeName);
    setError('');
    try {
      const result = await apiRequest('/data/product-attribute-values/board-columns', {
        method: 'POST',
        body: { attributeName, visible: Boolean(visible) },
      });
      setNames((current) => current.map((entry) => (
        entry.name === attributeName
          ? { ...entry, visible: Boolean(result?.visible), columnKey: result?.columnKey || entry.columnKey }
          : entry
      )));
    } catch (err) {
      setError(err?.message || 'Failed to update column visibility');
    } finally {
      setTogglingName('');
    }
  }, []);

  return useMemo(() => ({
    names,
    loading,
    error,
    togglingName,
    setVisible,
  }), [names, loading, error, togglingName, setVisible]);
}
