import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

// Generieke tabel-hook (User Story #139) — de tableKey-gedreven generalisatie
// van usePurchaseOrdersPage. Praat met het generieke contract onder
// /api/data/:tableKey en leidt kolommen DYNAMISCH af uit meta.columns
// (niets hardcoded). Zie het backend-contract in de opdracht.
//
// Response-vorm van GET /api/data/:tableKey:
//   { table:{key,label,hasDetail},
//     rows:[{partitionKey,recordKey,isNew,isChanged,values:{...},
//            details:[{detailKey,values:{...}}]}],
//     meta:{columns:{master:[col],detail:[col]}},
//     stale, hasCache, newCount, changedCount, syncedAt, total, ... }
//   col: { key, label, dataType, scope, source('source'|'custom'), isDefaultVisible }

const EMPTY_COLUMNS = { master: [], detail: [] };

export function useTableGrid(tableKey) {
  const [table, setTable] = useState(null); // { key, label, hasDetail }
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState(EMPTY_COLUMNS); // meta.columns { master, detail }
  const [syncedAt, setSyncedAt] = useState(null);
  const [stale, setStale] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  const [total, setTotal] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [changedCount, setChangedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingViewed, setMarkingViewed] = useState(false);
  const [error, setError] = useState('');

  const basePath = tableKey ? `/data/${encodeURIComponent(tableKey)}` : null;

  // Schrijft een GET/refresh-response weg in losse state.
  const applyData = useCallback((data) => {
    setTable(data?.table || null);
    setRows(Array.isArray(data?.rows) ? data.rows : []);
    const master = Array.isArray(data?.meta?.columns?.master) ? data.meta.columns.master : [];
    const detail = Array.isArray(data?.meta?.columns?.detail) ? data.meta.columns.detail : [];
    setColumns({ master, detail });
    setSyncedAt(data?.syncedAt ?? null);
    setStale(Boolean(data?.stale));
    setHasCache(Boolean(data?.hasCache));
    setTotal(Number(data?.total) || (Array.isArray(data?.rows) ? data.rows.length : 0));
    setNewCount(Number(data?.newCount) || 0);
    setChangedCount(Number(data?.changedCount) || 0);
  }, []);

  const load = useCallback(async () => {
    if (!basePath) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(basePath);
      applyData(data);
    } catch (err) {
      setError(err.message);
      setTable(null);
      setRows([]);
      setColumns(EMPTY_COLUMNS);
    } finally {
      setLoading(false);
    }
  }, [basePath, applyData]);

  useEffect(() => { load(); }, [load]);

  // Forceert een bron-refresh server-side en herlaadt de state.
  const refresh = useCallback(async () => {
    if (!basePath) return;
    setRefreshing(true);
    setError('');
    try {
      const data = await apiRequest(`${basePath}/refresh`, { method: 'POST' });
      applyData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [basePath, applyData]);

  // Markeer alles als gezien: zet het watermerk en herlaad zodat highlights verdwijnen.
  const markViewed = useCallback(async () => {
    if (!basePath) return;
    setMarkingViewed(true);
    setError('');
    try {
      await apiRequest(`${basePath}/viewed`, { method: 'POST' });
      const data = await apiRequest(basePath);
      applyData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setMarkingViewed(false);
    }
  }, [basePath, applyData]);

  // Optimistic update van één cel (master of detail); rollback bij fout.
  // detailKey is null voor master-cellen.
  const saveValue = useCallback(async ({ columnId, columnKey, partitionKey, recordKey, detailKey = null, value }) => {
    let previousRows = null;
    setRows((prev) => {
      previousRows = prev;
      return prev.map((row) => {
        if (row.partitionKey !== partitionKey || row.recordKey !== recordKey) return row;
        if (detailKey !== null && detailKey !== undefined) {
          return {
            ...row,
            details: (row.details || []).map((d) =>
              d.detailKey === detailKey
                ? { ...d, values: { ...d.values, [columnKey]: value } }
                : d),
          };
        }
        return { ...row, values: { ...row.values, [columnKey]: value } };
      });
    });
    try {
      await apiRequest(`${basePath}/value`, {
        method: 'PUT',
        body: { columnId, partitionKey, recordKey, detailKey: detailKey ?? null, value },
      });
    } catch (err) {
      if (previousRows) setRows(previousRows);
      throw err;
    }
  }, [basePath]);

  // Herlaadt alleen de kolomdefinities na een kolom-mutatie. Het contract levert
  // kolommen als onderdeel van GET /api/data/:tableKey → we herladen die en pakken meta.
  const reloadColumns = useCallback(async () => {
    if (!basePath) return;
    const data = await apiRequest(basePath);
    const master = Array.isArray(data?.meta?.columns?.master) ? data.meta.columns.master : [];
    const detail = Array.isArray(data?.meta?.columns?.detail) ? data.meta.columns.detail : [];
    setColumns({ master, detail });
    // Waarden van nieuw toegevoegde kolommen komen mee met de rows → ook bijwerken.
    if (Array.isArray(data?.rows)) setRows(data.rows);
  }, [basePath]);

  const addColumn = useCallback(async ({ label, scope = 'master', dataType, options }) => {
    const body = { label, scope, dataType };
    if (dataType === 'select' && Array.isArray(options)) body.options = options;
    await apiRequest(`${basePath}/columns`, { method: 'POST', body });
    await reloadColumns();
  }, [basePath, reloadColumns]);

  const renameColumn = useCallback(async (id, label) => {
    await apiRequest(`${basePath}/columns/${id}`, { method: 'PATCH', body: { label } });
    await reloadColumns();
  }, [basePath, reloadColumns]);

  const removeColumn = useCallback(async (id) => {
    await apiRequest(`${basePath}/columns/${id}`, { method: 'DELETE' });
    await reloadColumns();
  }, [basePath, reloadColumns]);

  const label = table?.label || '';
  const hasDetail = Boolean(table?.hasDetail);

  return useMemo(() => ({
    table,
    label,
    hasDetail,
    rows,
    // meta.columns dynamisch — de viewer bouwt kolommen hierop, niet hardcoded.
    masterColumns: columns.master,
    detailColumns: columns.detail,
    syncedAt,
    stale,
    hasCache,
    total,
    newCount,
    changedCount,
    loading,
    refreshing,
    markingViewed,
    error,
    refresh,
    markViewed,
    saveValue,
    addColumn,
    renameColumn,
    removeColumn,
    reload: load,
  }), [
    table, label, hasDetail, rows, columns, syncedAt, stale, hasCache, total,
    newCount, changedCount, loading, refreshing, markingViewed, error,
    refresh, markViewed, saveValue, addColumn, renameColumn, removeColumn, load,
  ]);
}

export default useTableGrid;
