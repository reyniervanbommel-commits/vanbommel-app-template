import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

/**
 * Admin-datamodel voor het PO-scherm: laadt entiteiten, relatie, kolommen
 * (inclusief verborgen) en cache-statistieken; levert toggles voor
 * kolom-zichtbaarheid en write-back.
 *
 * Output: { entities, relation, connection, columns, cache, loading, error,
 *           togglingKey, reload, toggleVisibility, toggleWriteback }
 */
export function useDataModelAdmin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Kolom-id waarvan een toggle bezig is (voorkomt dubbelklikken en toont spinner).
  const [togglingKey, setTogglingKey] = useState(null);

  const reload = useCallback(async () => {
    setError('');
    try {
      const result = await apiRequest('/purchase-orders/datamodel');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Vervangt één kolom in de state na een geslaagde PATCH (geen volledige reload nodig).
  const applyColumnUpdate = useCallback((column) => {
    setData((prev) => {
      if (!prev) return prev;
      const level = column.level;
      const list = (prev.columns?.[level] || []).map((c) => (c.id === column.id ? column : c));
      return { ...prev, columns: { ...prev.columns, [level]: list } };
    });
  }, []);

  const toggleVisibility = useCallback(async (column) => {
    setTogglingKey(`vis-${column.id}`);
    setError('');
    try {
      const result = await apiRequest(`/purchase-orders/columns/${column.id}/visibility`, {
        method: 'PATCH',
        body: { visible: !column.isActive },
      });
      applyColumnUpdate(result.column);
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingKey(null);
    }
  }, [applyColumnUpdate]);

  const toggleWriteback = useCallback(async (column) => {
    setTogglingKey(`wb-${column.id}`);
    setError('');
    try {
      const result = await apiRequest(`/purchase-orders/columns/${column.id}/writeback`, {
        method: 'PATCH',
        body: { writable: !column.writableToD365, mechanism: 'patch' },
      });
      applyColumnUpdate(result.column);
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingKey(null);
    }
  }, [applyColumnUpdate]);

  const syncNow = useCallback(async () => {
    setError('');
    try {
      await apiRequest('/purchase-orders/refresh', { method: 'POST' });
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }, [reload]);

  return useMemo(() => ({
    entities: data?.entities || [],
    relation: data?.relation || null,
    connection: data?.connection || null,
    columns: data?.columns || { header: [], line: [] },
    cache: data?.cache || null,
    syncFilter: data?.syncFilter || null,
    filterCatalog: data?.filterCatalog || { header: [], line: [] },
    previewTables: data?.previewTables || null,
    loading,
    error,
    togglingKey,
    reload,
    syncNow,
    toggleVisibility,
    toggleWriteback,
  }), [data, loading, error, togglingKey, reload, syncNow, toggleVisibility, toggleWriteback]);
}
