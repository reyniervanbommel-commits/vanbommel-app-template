import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';
import { BOARD_TB_SOURCE } from '../config/featureFlags';

// Board-cutover Fase 5/6 (#AB:174/#175): de admin-datamodel-pagina draait onder BOARD_TB_SOURCE op de
// generieke tb_*-laag (/api/data/purchase-orders/...). De tb_-kolomrespons wordt naar de admin-vorm
// (level/d365) gemapt zoals de po_-endpoints die leverden; het /datamodel-endpoint levert dat al gemapt.
const adminBase = (tableKey) => (BOARD_TB_SOURCE ? `/data/${tableKey}` : '/purchase-orders');
const NON_WRITABLE_KEYS = {
  header: new Set(['orderNumber', 'status', 'createdDateTime']),
  line: new Set(['lineNumber']),
};
const NON_HIDEABLE_KEYS = {
  header: new Set(['orderNumber']),
  line: new Set(['lineNumber']),
};

function normalizeLevel(col) {
  if (col.level === 'line' || col.level === 'header') return col.level;
  return col.scope === 'detail' ? 'line' : 'header';
}

function resolveWriteBackAllowed(column) {
  if (typeof column.writeBackAllowed === 'boolean') return column.writeBackAllowed;
  if (column.source !== 'd365' || !column.d365Field) return false;
  return !(NON_WRITABLE_KEYS[column.level] || new Set()).has(column.key);
}

function resolveHideAllowed(column) {
  if (typeof column.hideAllowed === 'boolean') return column.hideAllowed;
  return !(NON_HIDEABLE_KEYS[column.level] || new Set()).has(column.key);
}

/**
 * Mag deze kolom als RCCP-waardekolom worden vrijgegeven? Alleen een technische check: RCCP leest
 * de tabel zonder userId, dus custom kolommen zonder formule (gevuld vanuit persoonlijke
 * bord-instellingen) zijn daar altijd leeg. Wélke kolom zinvol is, bepaalt de admin.
 * Spiegelt resolveRccpMeasureEligibility in server/services/TableColumnsService.js.
 */
function resolveRccpMeasureBlockedReason(column) {
  if (column.dataType !== 'number') return 'Only number columns can be used as an RCCP value';
  // Deze tab toont ook inactieve kolommen (nodig om ze te kunnen heractiveren), maar die worden
  // niet gesynct en zijn in RCCP dus altijd leeg.
  if (!column.isActive) return 'Inactive columns are not synced, so they are always empty in RCCP';
  if (column.source === 'custom' && !column.formulaExpr) {
    return 'Filled from personal board settings, so always empty in RCCP';
  }
  return null;
}

function mapAdminColumn(col) {
  if (!col || !BOARD_TB_SOURCE) return col;
  const source = col.source === 'source' ? 'd365' : col.source;
  const level = normalizeLevel(col);
  const mappedColumn = {
    ...col,
    level,
    source,
    d365Field: col.sourceField ?? col.d365Field ?? null,
    writableToD365: Boolean(col.writable ?? col.writableToD365),
    rccpMeasure: Boolean(col.rccpMeasure),
  };
  const rccpMeasureBlockedReason = resolveRccpMeasureBlockedReason(mappedColumn);
  return {
    ...mappedColumn,
    writeBackAllowed: resolveWriteBackAllowed(mappedColumn),
    hideAllowed: resolveHideAllowed(mappedColumn),
    rccpMeasureAllowed: !rccpMeasureBlockedReason,
    rccpMeasureBlockedReason,
  };
}

function mapDataModelPayload(payload) {
  if (!payload || !BOARD_TB_SOURCE) return payload;
  return {
    ...payload,
    columns: {
      header: Array.isArray(payload.columns?.header) ? payload.columns.header.map(mapAdminColumn) : [],
      line: Array.isArray(payload.columns?.line) ? payload.columns.line.map(mapAdminColumn) : [],
    },
  };
}

/**
 * Admin-datamodel voor het PO-scherm: laadt entiteiten, relatie, kolommen
 * (inclusief verborgen) en cache-statistieken; levert toggles voor
 * kolom-zichtbaarheid en write-back.
 *
 * Output: { entities, relation, connection, columns, cache, loading, error,
 *           togglingKey, reload, toggleVisibility, toggleWriteback,
 *           setColumnToggleState, deleteColumn }
 */
export function useDataModelAdmin(tableKey = 'purchase-orders') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Kolom-id waarvan een toggle bezig is (voorkomt dubbelklikken en toont spinner).
  const [togglingKey, setTogglingKey] = useState(null);
  const adminBasePath = adminBase(tableKey);

  const reload = useCallback(async () => {
    setError('');
    try {
      const result = await apiRequest(`${adminBasePath}/datamodel`);
      setData(mapDataModelPayload(result));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminBasePath]);

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
      const result = await apiRequest(`${adminBasePath}/columns/${column.id}/visibility`, {
        method: 'PATCH',
        body: { visible: !column.isActive },
      });
      applyColumnUpdate(mapAdminColumn(result.column));
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingKey(null);
    }
  }, [adminBasePath, applyColumnUpdate]);

  const toggleVisibleAtDelete = useCallback(async (column) => {
    setTogglingKey(`vad-${column.id}`);
    setError('');
    try {
      const result = await apiRequest(`${adminBasePath}/columns/${column.id}/visible-at-delete`, {
        method: 'PATCH',
        body: { visible: !column.visibleAtDelete },
      });
      applyColumnUpdate(mapAdminColumn(result.column));
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingKey(null);
    }
  }, [adminBasePath, applyColumnUpdate]);

  const toggleWriteback = useCallback(async (column) => {
    setTogglingKey(`wb-${column.id}`);
    setError('');
    try {
      const result = await apiRequest(`${adminBasePath}/columns/${column.id}/writeback`, {
        method: 'PATCH',
        body: { writable: !column.writableToD365, mechanism: 'patch' },
      });
      applyColumnUpdate(mapAdminColumn(result.column));
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingKey(null);
    }
  }, [adminBasePath, applyColumnUpdate]);

  const toggleRccpMeasure = useCallback(async (column) => {
    setTogglingKey(`rccp-${column.id}`);
    setError('');
    try {
      const result = await apiRequest(`${adminBasePath}/columns/${column.id}/rccp-measure`, {
        method: 'PATCH',
        body: { enabled: !column.rccpMeasure },
      });
      applyColumnUpdate(mapAdminColumn(result.column));
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingKey(null);
    }
  }, [adminBasePath, applyColumnUpdate]);

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
          const result = await apiRequest(`${adminBasePath}/columns/${column.id}/visibility`, {
            method: 'PATCH',
            body: { visible: shouldEnable },
          });
          return mapAdminColumn(result.column);
        }
        if (toggleType === 'visibleAtDelete') {
          const result = await apiRequest(`${adminBasePath}/columns/${column.id}/visible-at-delete`, {
            method: 'PATCH',
            body: { visible: shouldEnable },
          });
          return mapAdminColumn(result.column);
        }
        const result = await apiRequest(`${adminBasePath}/columns/${column.id}/writeback`, {
          method: 'PATCH',
          body: { writable: shouldEnable, mechanism: 'patch' },
        });
        return mapAdminColumn(result.column);
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
  }, [adminBasePath, applyColumnUpdates]);

  const deleteColumn = useCallback(async (column) => {
    if (!column?.id || column.source !== 'custom') return;
    setTogglingKey(`del-${column.id}`);
    setError('');
    try {
      await apiRequest(`${adminBasePath}/columns/${column.id}`, {
        method: 'DELETE',
      });
      removeColumnFromState(column);
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingKey(null);
    }
  }, [adminBasePath, removeColumnFromState]);

  const syncNow = useCallback(async () => {
    setError('');
    try {
      await apiRequest(`${adminBasePath}/refresh`, { method: 'POST' });
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }, [adminBasePath, reload]);

  const discoverFields = useCallback(async () => {
    setTogglingKey('discover-fields');
    setError('');
    try {
      const discovery = await apiRequest(`${adminBasePath}/discover-fields`, { method: 'POST' });
      const result = await apiRequest(`${adminBasePath}/datamodel`);
      setData(mapDataModelPayload({ ...result, discovery }));
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingKey(null);
    }
  }, [adminBasePath]);

  return useMemo(() => ({
    entities: data?.entities || [],
    relation: data?.relation || null,
    connection: data?.connection || null,
    columns: data?.columns || { header: [], line: [] },
    cache: data?.cache || null,
    syncFilter: data?.syncFilter || null,
    filterCatalog: data?.filterCatalog || { header: [], line: [] },
    previewTables: data?.previewTables || null,
    lookups: data?.lookups || [],
    discovery: data?.discovery || null,
    loading,
    error,
    togglingKey,
    reload,
    syncNow,
    discoverFields,
    toggleVisibility,
    toggleVisibleAtDelete,
    toggleWriteback,
    toggleRccpMeasure,
    setColumnToggleState,
    deleteColumn,
  }), [data, loading, error, togglingKey, reload, syncNow, discoverFields, toggleVisibility, toggleVisibleAtDelete, toggleWriteback, toggleRccpMeasure, setColumnToggleState, deleteColumn]);
}
