import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

/**
 * Admin-datamodel voor het PO-scherm: laadt entiteiten, relatie, kolommen
 * (inclusief verborgen) en cache-statistieken; levert toggles voor
 * kolom-zichtbaarheid en write-back.
 *
 * Output: { entities, relation, connection, columns, cache, loading, error,
 *           togglingKey, reload, toggleVisibility, toggleWriteback,
 *           setColumnToggleState, deleteColumn }
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

  const applyColumnUpdates = useCallback((updatedColumns) => {
    if (!Array.isArray(updatedColumns) || !updatedColumns.length) return;
    setData((prev) => {
      if (!prev) return prev;
      const updatesByLevel = updatedColumns.reduce((acc, column) => {
        if (!column?.id || !column?.level) return acc;
        const levelUpdates = acc.get(column.level) || new Map();
        levelUpdates.set(column.id, column);
        acc.set(column.level, levelUpdates);
        return acc;
      }, new Map());
      if (!updatesByLevel.size) return prev;

      const nextColumns = { ...prev.columns };
      updatesByLevel.forEach((levelUpdates, level) => {
        nextColumns[level] = (prev.columns?.[level] || []).map((column) => (
          levelUpdates.get(column.id) || column
        ));
      });

      return { ...prev, columns: nextColumns };
    });
  }, []);

  const removeColumnFromState = useCallback((column) => {
    setData((prev) => {
      if (!prev) return prev;
      const level = column.level;
      const list = (prev.columns?.[level] || []).filter((c) => c.id !== column.id);
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

  const toggleVisibleAtDelete = useCallback(async (column) => {
    setTogglingKey(`vad-${column.id}`);
    setError('');
    try {
      const result = await apiRequest(`/purchase-orders/columns/${column.id}/visible-at-delete`, {
        method: 'PATCH',
        body: { visible: !column.visibleAtDelete },
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

  const setColumnToggleState = useCallback(async ({ columns: scopedColumns = [], toggleType, enabled }) => {
    if (!Array.isArray(scopedColumns) || !toggleType) return;
    const shouldEnable = Boolean(enabled);

    const eligibleColumns = scopedColumns.filter((column) => {
      if (toggleType === 'visibility') return column.hideAllowed && column.isActive !== shouldEnable;
      if (toggleType === 'visibleAtDelete') return column.visibleAtDelete !== shouldEnable;
      if (toggleType === 'writeback') return column.writeBackAllowed && column.writableToD365 !== shouldEnable;
      return false;
    });

    if (!eligibleColumns.length) return;

    setTogglingKey(`bulk-${toggleType}-${shouldEnable ? 'on' : 'off'}`);
    setError('');
    try {
      const updates = await Promise.allSettled(eligibleColumns.map(async (column) => {
        if (toggleType === 'visibility') {
          const result = await apiRequest(`/purchase-orders/columns/${column.id}/visibility`, {
            method: 'PATCH',
            body: { visible: shouldEnable },
          });
          return result.column;
        }
        if (toggleType === 'visibleAtDelete') {
          const result = await apiRequest(`/purchase-orders/columns/${column.id}/visible-at-delete`, {
            method: 'PATCH',
            body: { visible: shouldEnable },
          });
          return result.column;
        }
        const result = await apiRequest(`/purchase-orders/columns/${column.id}/writeback`, {
          method: 'PATCH',
          body: { writable: shouldEnable, mechanism: 'patch' },
        });
        return result.column;
      }));

      const successfulUpdates = [];
      let failedCount = 0;
      let firstErrorMessage = '';
      updates.forEach((entry) => {
        if (entry.status === 'fulfilled' && entry.value) {
          successfulUpdates.push(entry.value);
          return;
        }
        failedCount += 1;
        if (!firstErrorMessage) firstErrorMessage = entry.reason?.message || 'Unknown error';
      });

      if (successfulUpdates.length) {
        applyColumnUpdates(successfulUpdates);
      }
      if (failedCount) {
        const label = failedCount === 1 ? 'column' : 'columns';
        setError(`Bulk update failed for ${failedCount} ${label}. ${firstErrorMessage}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingKey(null);
    }
  }, [applyColumnUpdates]);

  const deleteColumn = useCallback(async (column) => {
    if (!column?.id || column.source !== 'custom') return;
    setTogglingKey(`del-${column.id}`);
    setError('');
    try {
      await apiRequest(`/purchase-orders/columns/${column.id}`, {
        method: 'DELETE',
      });
      removeColumnFromState(column);
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingKey(null);
    }
  }, [removeColumnFromState]);

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
    toggleVisibleAtDelete,
    toggleWriteback,
    setColumnToggleState,
    deleteColumn,
  }), [data, loading, error, togglingKey, reload, syncNow, toggleVisibility, toggleVisibleAtDelete, toggleWriteback, setColumnToggleState, deleteColumn]);
}
