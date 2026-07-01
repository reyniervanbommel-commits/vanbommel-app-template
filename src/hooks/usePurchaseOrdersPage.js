import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

const BOARD_KEY = 'purchase-orders';

// AANNAME: De nieuwe SQL-backed API levert alle data (orders + dynamische kolommen)
// in één GET-call onder /purchase-orders (NIET onder /supplier). De lazy refresh
// gebeurt server-side via ?autoRefresh=1. Zie het API-contract in story #132.

function normalizeVisibleColumns(rawKeys, defaultKeys) {
  if (!Array.isArray(rawKeys) || !rawKeys.length) {
    return defaultKeys;
  }
  const allowed = new Set(defaultKeys);
  const filtered = Array.from(new Set(rawKeys.filter((key) => allowed.has(key))));
  return filtered.length ? filtered : defaultKeys;
}

function normalizeColumnOrder(rawKeys, defaultKeys) {
  if (!Array.isArray(rawKeys) || !rawKeys.length) {
    return defaultKeys;
  }
  const allowed = new Set(defaultKeys);
  const filtered = Array.from(new Set(rawKeys.filter((key) => allowed.has(key))));
  const missing = defaultKeys.filter((key) => !filtered.includes(key));
  return [...filtered, ...missing];
}

/**
 * Haalt purchase orders op uit de SQL-backed backend (met dynamische kolommen)
 * en beheert kolomvoorkeuren (zichtbaarheid/volgorde) per gebruiker via board-settings.
 */
export function usePurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [headerColumns, setHeaderColumns] = useState([]);
  const [lineColumns, setLineColumns] = useState([]);
  const [syncedAt, setSyncedAt] = useState(null);
  const [stale, setStale] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  const [staleThresholdMinutes, setStaleThresholdMinutes] = useState(0);
  const [total, setTotal] = useState(0);
  // Nieuw-detectie per gebruiker (#133)
  const [newCount, setNewCount] = useState(0);
  const [changedCount, setChangedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingViewed, setMarkingViewed] = useState(false);
  const [error, setError] = useState('');

  // Board-settings t.b.v. zichtbaarheid/volgorde van header-kolommen (op key-basis).
  const [visibleColumnKeys, setVisibleColumnKeys] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [boardSettingsLoaded, setBoardSettingsLoaded] = useState(false);
  const [savingColumns, setSavingColumns] = useState(false);

  // Schrijft de response-body (van GET of POST refresh) weg in de losse state.
  const applyData = useCallback((data) => {
    setOrders(Array.isArray(data?.orders) ? data.orders : []);
    setHeaderColumns(Array.isArray(data?.columns?.header) ? data.columns.header : []);
    setLineColumns(Array.isArray(data?.columns?.line) ? data.columns.line : []);
    setSyncedAt(data?.syncedAt ?? null);
    setStale(Boolean(data?.stale));
    setHasCache(Boolean(data?.hasCache));
    setStaleThresholdMinutes(Number(data?.staleThresholdMinutes) || 0);
    setTotal(Number(data?.total) || 0);
    setNewCount(Number(data?.newCount) || 0);
    setChangedCount(Number(data?.changedCount) || 0);
  }, []);

  const loadPurchaseOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/purchase-orders?autoRefresh=1');
      applyData(data);
    } catch (err) {
      setError(err.message);
      setOrders([]);
      setHeaderColumns([]);
      setLineColumns([]);
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  const loadBoardSettings = useCallback(async () => {
    try {
      const data = await apiRequest('/supplier/board-settings/' + BOARD_KEY);
      const settings = data?.settings || null;
      setVisibleColumnKeys(Array.isArray(settings?.visibleColumns) ? settings.visibleColumns : []);
      setColumnOrder(Array.isArray(settings?.columnOrder) ? settings.columnOrder : []);
    } catch {
      // Board-settings zijn optioneel; bij afwezigheid blijven alle kolommen zichtbaar.
      setVisibleColumnKeys([]);
      setColumnOrder([]);
    } finally {
      setBoardSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadPurchaseOrders();
    loadBoardSettings();
  }, [loadPurchaseOrders, loadBoardSettings]);

  // Forceert een D365-refresh server-side en herlaadt de hele state.
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const data = await apiRequest('/purchase-orders/refresh', { method: 'POST' });
      applyData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [applyData]);

  // Markeer alles als gezien: zet het laatst-bekeken-watermerk en herlaad zodat de highlights verdwijnen.
  const markViewed = useCallback(async () => {
    setMarkingViewed(true);
    setError('');
    try {
      await apiRequest('/purchase-orders/viewed', { method: 'POST' });
      const data = await apiRequest('/purchase-orders');
      applyData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setMarkingViewed(false);
    }
  }, [applyData]);

  // Optimistic update van één cel; bij fout wordt de oude waarde teruggezet.
  const saveValue = useCallback(async ({ columnId, columnKey, dataAreaId, orderNumber, lineNumber, value }) => {
    const isLine = lineNumber !== null && lineNumber !== undefined;

    // Bewaar vorige state voor rollback.
    let previousOrders = null;
    setOrders((prev) => {
      previousOrders = prev;
      return prev.map((order) => {
        if (order.dataAreaId !== dataAreaId || order.orderNumber !== orderNumber) {
          return order;
        }
        if (isLine) {
          return {
            ...order,
            lines: (order.lines || []).map((line) =>
              line.lineNumber === lineNumber
                ? { ...line, values: { ...line.values, [columnKey]: value } }
                : line
            ),
          };
        }
        return { ...order, values: { ...order.values, [columnKey]: value } };
      });
    });

    try {
      await apiRequest('/purchase-orders/values', {
        method: 'PUT',
        body: {
          columnId,
          dataAreaId,
          orderNumber,
          lineNumber: isLine ? lineNumber : null,
          value,
        },
      });
    } catch (err) {
      // Rollback bij fout.
      if (previousOrders) setOrders(previousOrders);
      throw err;
    }
  }, []);

  // D365-veldcorrectie terugschrijven (#134). Optimistic; bij fout terugdraaien + fout doorgeven.
  const correctField = useCallback(async ({ columnId, columnKey, dataAreaId, orderNumber, lineNumber, value, basedOnValue }) => {
    const isLine = lineNumber !== null && lineNumber !== undefined;
    let previousOrders = null;
    setOrders((prev) => {
      previousOrders = prev;
      return prev.map((order) => {
        if (order.dataAreaId !== dataAreaId || order.orderNumber !== orderNumber) return order;
        if (isLine) {
          return {
            ...order,
            lines: (order.lines || []).map((line) =>
              line.lineNumber === lineNumber ? { ...line, values: { ...line.values, [columnKey]: value } } : line
            ),
          };
        }
        return { ...order, values: { ...order.values, [columnKey]: value } };
      });
    });
    try {
      await apiRequest('/purchase-orders/correct', {
        method: 'POST',
        body: { columnId, dataAreaId, orderNumber, lineNumber: isLine ? lineNumber : null, value, basedOnValue },
      });
    } catch (err) {
      if (previousOrders) setOrders(previousOrders);
      throw err;
    }
  }, []);

  // Herlaadt alleen de kolomdefinities (na toevoegen/hernoemen/verwijderen).
  const reloadColumns = useCallback(async () => {
    const [headerData, lineData] = await Promise.all([
      apiRequest('/purchase-orders/columns?level=header'),
      apiRequest('/purchase-orders/columns?level=line'),
    ]);
    setHeaderColumns(Array.isArray(headerData?.columns) ? headerData.columns : []);
    setLineColumns(Array.isArray(lineData?.columns) ? lineData.columns : []);
  }, []);

  const addColumn = useCallback(async ({ label, level, dataType, options }) => {
    const body = { label, level, dataType };
    if (dataType === 'select' && Array.isArray(options)) {
      body.options = options;
    }
    await apiRequest('/purchase-orders/columns', { method: 'POST', body });
    await reloadColumns();
  }, [reloadColumns]);

  const renameColumn = useCallback(async (id, label) => {
    await apiRequest('/purchase-orders/columns/' + id, { method: 'PATCH', body: { label } });
    await reloadColumns();
  }, [reloadColumns]);

  // Admin: zet write-back aan/uit op een D365-kolom (#134).
  const toggleWriteback = useCallback(async (columnId, writable) => {
    await apiRequest('/purchase-orders/columns/' + columnId + '/writeback', {
      method: 'PATCH',
      body: { writable, mechanism: 'patch' },
    });
    await reloadColumns();
  }, [reloadColumns]);

  const removeColumn = useCallback(async (id) => {
    await apiRequest('/purchase-orders/columns/' + id, { method: 'DELETE' });
    await reloadColumns();
  }, [reloadColumns]);

  // Past board-settings (zichtbaarheid/volgorde) toe op de dynamische header-kolommen.
  // Onbekende keys (bv. verwijderde kolommen) worden genegeerd; nieuwe kolommen zijn
  // standaard zichtbaar en sluiten achteraan aan.
  const defaultHeaderKeys = useMemo(
    () => headerColumns.map((column) => column.key),
    [headerColumns]
  );

  const effectiveVisibleKeys = useMemo(() => {
    if (!boardSettingsLoaded || !visibleColumnKeys.length) {
      return defaultHeaderKeys;
    }
    // Nieuwe (nog niet in settings bekende) kolommen blijven zichtbaar.
    const known = new Set(visibleColumnKeys);
    const visible = normalizeVisibleColumns(visibleColumnKeys, defaultHeaderKeys);
    const newKeys = defaultHeaderKeys.filter((key) => !known.has(key));
    return Array.from(new Set([...visible, ...newKeys]));
  }, [boardSettingsLoaded, visibleColumnKeys, defaultHeaderKeys]);

  const orderedHeaderColumns = useMemo(() => {
    const byKey = new Map(headerColumns.map((column) => [column.key, column]));
    const order = normalizeColumnOrder(columnOrder, defaultHeaderKeys);
    return order
      .filter((key) => byKey.has(key) && effectiveVisibleKeys.includes(key))
      .map((key) => byKey.get(key));
  }, [headerColumns, columnOrder, defaultHeaderKeys, effectiveVisibleKeys]);

  const saveVisibleColumns = useCallback(async (nextVisibleKeys) => {
    const normalized = normalizeVisibleColumns(nextVisibleKeys, defaultHeaderKeys);
    const normalizedOrder = normalizeColumnOrder(columnOrder, defaultHeaderKeys);
    setVisibleColumnKeys(normalized);
    setColumnOrder(normalizedOrder);
    setSavingColumns(true);
    try {
      await apiRequest('/supplier/board-settings/' + BOARD_KEY, {
        method: 'PATCH',
        body: { settings: { visibleColumns: normalized, columnOrder: normalizedOrder } },
      });
    } finally {
      setSavingColumns(false);
    }
  }, [columnOrder, defaultHeaderKeys]);

  return useMemo(() => ({
    orders,
    headerColumns,
    lineColumns,
    // Header-kolommen met board-settings (zichtbaarheid/volgorde) toegepast.
    visibleHeaderColumns: orderedHeaderColumns,
    syncedAt,
    stale,
    hasCache,
    staleThresholdMinutes,
    total,
    newCount,
    changedCount,
    loading,
    refreshing,
    markingViewed,
    error,
    visibleColumnKeys: effectiveVisibleKeys,
    savingColumns,
    refresh,
    markViewed,
    saveValue,
    correctField,
    toggleWriteback,
    addColumn,
    renameColumn,
    removeColumn,
    saveVisibleColumns,
  }), [
    orders,
    headerColumns,
    lineColumns,
    orderedHeaderColumns,
    syncedAt,
    stale,
    hasCache,
    staleThresholdMinutes,
    total,
    newCount,
    changedCount,
    loading,
    refreshing,
    markingViewed,
    error,
    effectiveVisibleKeys,
    savingColumns,
    refresh,
    markViewed,
    saveValue,
    correctField,
    toggleWriteback,
    addColumn,
    renameColumn,
    removeColumn,
    saveVisibleColumns,
  ]);
}
