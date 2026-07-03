import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

/**
 * Data model voor een generieke tb_*-tabel (bv. vendors, items) via /api/data/:tableKey (#AB:161).
 * Levert de kolomdefinities (meta.columns) + een sample-rij + sync-actie. Read-only kolomoverzicht:
 * per-kolom zichtbaarheids-toggles bestaan (nog) niet op de generieke laag — dat volgt met de cutover.
 *
 * Output: { loading, error, refreshing, columns:{master,detail}, sample:{master,detail},
 *           rowCount, syncedAt, stale, hasCache, hasDetail, label, reload, refresh }
 */
export function useGenericTableModel(tableKey) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ auto = true } = {}) => {
    if (!tableKey) return;
    setError('');
    try {
      const query = auto ? '?autoRefresh=1' : '';
      const result = await apiRequest(`/data/${encodeURIComponent(tableKey)}${query}`);
      setData(result);
      if (result.refreshError) setError(result.refreshError);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableKey]);

  useEffect(() => {
    setLoading(true);
    load({ auto: true });
  }, [load]);

  const refresh = useCallback(async () => {
    if (!tableKey) return;
    setRefreshing(true);
    setError('');
    try {
      const result = await apiRequest(`/data/${encodeURIComponent(tableKey)}/refresh`, { method: 'POST' });
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [tableKey]);

  return useMemo(() => {
    const columns = data?.meta?.columns || { master: [], detail: [] };
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const firstMaster = rows[0] || null;
    const firstDetail = firstMaster && Array.isArray(firstMaster.details) ? firstMaster.details[0] : null;
    return {
      loading,
      error,
      refreshing,
      columns,
      sample: { master: firstMaster?.values || null, detail: firstDetail?.values || null },
      rowCount: typeof data?.total === 'number' ? data.total : rows.length,
      syncedAt: data?.syncedAt || null,
      stale: Boolean(data?.stale),
      hasCache: Boolean(data?.hasCache),
      hasDetail: Boolean(data?.table?.hasDetail),
      label: data?.table?.label || tableKey,
      reload: load,
      refresh,
    };
  }, [data, loading, error, refreshing, tableKey, load, refresh]);
}
