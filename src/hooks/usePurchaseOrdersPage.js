import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';
import { getCachedPurchaseOrdersView, setCachedPurchaseOrdersView } from '../utils/purchaseOrdersViewCache';

const BOARD_KEY = 'purchase-orders';
const MIN_COLUMN_WIDTH = 80;
const MAX_COLUMN_WIDTH = 1000;

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

function arraysEqual(left, right) {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function normalizeColumnWidths(rawWidths, allowedKeys) {
  if (!rawWidths || typeof rawWidths !== 'object' || Array.isArray(rawWidths)) {
    return {};
  }
  const allowed = Array.isArray(allowedKeys) && allowedKeys.length
    ? new Set(allowedKeys)
    : null;
  return Object.entries(rawWidths).reduce((acc, [rawKey, rawWidth]) => {
    const key = String(rawKey || '').trim();
    if (!key) return acc;
    if (allowed && !allowed.has(key)) return acc;
    const width = Number(rawWidth);
    if (!Number.isFinite(width)) return acc;
    const clamped = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));
    acc[key] = clamped;
    return acc;
  }, {});
}

function moveColumnKey(rawOrder, defaultKeys, sourceKey, targetKey, position = 'before', movableKeys = defaultKeys) {
  const order = normalizeColumnOrder(rawOrder, defaultKeys);
  const allowedSet = new Set(Array.isArray(movableKeys) && movableKeys.length ? movableKeys : defaultKeys);
  const movableOrder = order.filter((key) => allowedSet.has(key));
  const sourceIndex = movableOrder.indexOf(sourceKey);
  const targetIndex = movableOrder.indexOf(targetKey);
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return order;

  const nextMovableOrder = [...movableOrder];
  const [movedKey] = nextMovableOrder.splice(sourceIndex, 1);
  const normalizedPosition = position === 'after' ? 'after' : 'before';
  const nextTargetIndex = nextMovableOrder.indexOf(targetKey);
  if (nextTargetIndex === -1) return order;
  const insertAt = normalizedPosition === 'after' ? nextTargetIndex + 1 : nextTargetIndex;
  nextMovableOrder.splice(insertAt, 0, movedKey);

  let movableIndex = 0;
  return order.map((key) => {
    if (!allowedSet.has(key)) return key;
    const replacement = nextMovableOrder[movableIndex];
    movableIndex += 1;
    return replacement;
  });
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
  const [lineColumnOrder, setLineColumnOrder] = useState([]);
  const [headerColumnWidths, setHeaderColumnWidths] = useState({});
  const [lineColumnWidths, setLineColumnWidths] = useState({});
  const [boardSettingsLoaded, setBoardSettingsLoaded] = useState(false);
  const [savingColumns, setSavingColumns] = useState(false);
  // Onthoudt een net-aangemaakte kolom die nog rechts van zijn bron gezet moet worden.
  const [pendingInsertAfter, setPendingInsertAfter] = useState(null);

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
    setCachedPurchaseOrdersView(data);
  }, []);

  const loadPurchaseOrders = useCallback(async ({ skipLoading = false, autoRefresh = false } = {}) => {
    if (!skipLoading) {
      setLoading(true);
    }
    setError('');
    try {
      const endpoint = autoRefresh ? '/purchase-orders?autoRefresh=1' : '/purchase-orders';
      const data = await apiRequest(endpoint);
      applyData(data);
      return data;
    } catch (err) {
      setError(err.message);
      if (!skipLoading) {
        setOrders([]);
        setHeaderColumns([]);
        setLineColumns([]);
      }
      return null;
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  }, [applyData]);

  const loadBoardSettings = useCallback(async () => {
    try {
      const data = await apiRequest('/supplier/board-settings/' + BOARD_KEY);
      const settings = data?.settings || null;
      setVisibleColumnKeys(Array.isArray(settings?.visibleColumns) ? settings.visibleColumns : []);
      setColumnOrder(Array.isArray(settings?.columnOrder) ? settings.columnOrder : []);
      setLineColumnOrder(Array.isArray(settings?.lineColumnOrder) ? settings.lineColumnOrder : []);
      setHeaderColumnWidths(normalizeColumnWidths(settings?.headerColumnWidths));
      setLineColumnWidths(normalizeColumnWidths(settings?.lineColumnWidths));
    } catch {
      // Board-settings zijn optioneel; bij afwezigheid blijven alle kolommen zichtbaar.
      setVisibleColumnKeys([]);
      setColumnOrder([]);
      setLineColumnOrder([]);
      setHeaderColumnWidths({});
      setLineColumnWidths({});
    } finally {
      setBoardSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const cachedData = getCachedPurchaseOrdersView();
    const hasCachedData = Boolean(cachedData);

    if (hasCachedData) {
      applyData(cachedData);
      setLoading(false);
    }

    const bootstrap = async () => {
      const data = await loadPurchaseOrders({ skipLoading: hasCachedData, autoRefresh: false });
      if (!active || !data?.stale) {
        return;
      }
      setRefreshing(true);
      setError('');
      try {
        const refreshedData = await apiRequest('/purchase-orders/refresh', { method: 'POST' });
        if (active) {
          applyData(refreshedData);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setRefreshing(false);
        }
      }
    };
    bootstrap();
    loadBoardSettings();
    return () => {
      active = false;
    };
  }, [applyData, loadPurchaseOrders, loadBoardSettings]);

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

  // Bulk "verwijderen": verberg de geselecteerde rijen (SQL-only exclusion, geen D365-mutatie).
  // Optimistic: rijen verdwijnen direct; bij een API-fout wordt de vorige lijst teruggezet.
  const deleteRows = useCallback(async (rows) => {
    const targets = (Array.isArray(rows) ? rows : []).filter(
      (row) => row && row.dataAreaId && row.orderNumber
    );
    if (!targets.length) return;
    const keySet = new Set(targets.map((row) => `${row.dataAreaId}|${row.orderNumber}`));

    let previousOrders = null;
    setOrders((prev) => {
      previousOrders = prev;
      return prev.filter((order) => !keySet.has(`${order.dataAreaId}|${order.orderNumber}`));
    });
    setTotal((prev) => Math.max(0, prev - keySet.size));

    try {
      await apiRequest('/purchase-orders/rows/exclude', {
        method: 'POST',
        body: { rows: targets },
      });
    } catch (err) {
      if (previousOrders) setOrders(previousOrders);
      setTotal((prev) => prev + keySet.size);
      setError(err.message);
      throw err;
    }
  }, []);

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
    const res = await apiRequest('/purchase-orders/columns', { method: 'POST', body });
    await reloadColumns();
    return res?.column || null;
  }, [reloadColumns]);

  // Monday-stijl: voeg een header-kolom toe direct rechts van een bestaande kolom.
  // De nieuwe kolom wordt aangemaakt (achteraan), waarna een effect hem naar de juiste
  // plek verplaatst zodra hij in de kolomdefinities verschijnt (async na reload).
  const addHeaderColumnAfter = useCallback(async (afterKey, { label, dataType, options }) => {
    const created = await addColumn({ label, level: 'header', dataType, options });
    if (created?.key && afterKey) {
      setPendingInsertAfter({ newKey: created.key, afterKey });
    }
    return created;
  }, [addColumn]);

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

  const defaultLineKeys = useMemo(
    () => lineColumns.map((column) => column.key),
    [lineColumns]
  );

  const orderedLineColumns = useMemo(() => {
    const byKey = new Map(lineColumns.map((column) => [column.key, column]));
    const order = normalizeColumnOrder(lineColumnOrder, defaultLineKeys);
    return order
      .filter((key) => byKey.has(key))
      .map((key) => byKey.get(key));
  }, [lineColumns, lineColumnOrder, defaultLineKeys]);

  const effectiveHeaderColumnWidths = useMemo(
    () => normalizeColumnWidths(headerColumnWidths, defaultHeaderKeys),
    [headerColumnWidths, defaultHeaderKeys]
  );
  const effectiveLineColumnWidths = useMemo(
    () => normalizeColumnWidths(lineColumnWidths, defaultLineKeys),
    [lineColumnWidths, defaultLineKeys]
  );

  const persistBoardSettings = useCallback(async ({
    nextVisibleKeys = visibleColumnKeys,
    nextHeaderOrder = columnOrder,
    nextLineOrder = lineColumnOrder,
    nextHeaderWidths = headerColumnWidths,
    nextLineWidths = lineColumnWidths,
  } = {}) => {
    const normalizedVisible = normalizeVisibleColumns(nextVisibleKeys, defaultHeaderKeys);
    const normalizedHeaderOrder = normalizeColumnOrder(nextHeaderOrder, defaultHeaderKeys);
    const normalizedLineOrder = normalizeColumnOrder(nextLineOrder, defaultLineKeys);
    const normalizedHeaderWidths = normalizeColumnWidths(nextHeaderWidths, defaultHeaderKeys);
    const normalizedLineWidths = normalizeColumnWidths(nextLineWidths, defaultLineKeys);

    setVisibleColumnKeys(normalizedVisible);
    setColumnOrder(normalizedHeaderOrder);
    setLineColumnOrder(normalizedLineOrder);
    setHeaderColumnWidths(normalizedHeaderWidths);
    setLineColumnWidths(normalizedLineWidths);
    setSavingColumns(true);
    try {
      await apiRequest('/supplier/board-settings/' + BOARD_KEY, {
        method: 'PATCH',
        body: {
          settings: {
            visibleColumns: normalizedVisible,
            columnOrder: normalizedHeaderOrder,
            lineColumnOrder: normalizedLineOrder,
            headerColumnWidths: normalizedHeaderWidths,
            lineColumnWidths: normalizedLineWidths,
          },
        },
      });
    } finally {
      setSavingColumns(false);
    }
  }, [visibleColumnKeys, columnOrder, lineColumnOrder, headerColumnWidths, lineColumnWidths, defaultHeaderKeys, defaultLineKeys]);

  const saveVisibleColumns = useCallback(async (nextVisibleKeys) => {
    await persistBoardSettings({ nextVisibleKeys });
  }, [persistBoardSettings]);

  // Serialiseer de huidige kolomlayout (zichtbaarheid/volgorde) voor een saved view.
  const exportColumnLayout = useCallback(() => ({
    visibleColumns: effectiveVisibleKeys,
    columnOrder: normalizeColumnOrder(columnOrder, defaultHeaderKeys),
    lineColumnOrder: normalizeColumnOrder(lineColumnOrder, defaultLineKeys),
    headerColumnWidths: effectiveHeaderColumnWidths,
    lineColumnWidths: effectiveLineColumnWidths,
  }), [
    effectiveVisibleKeys,
    columnOrder,
    defaultHeaderKeys,
    lineColumnOrder,
    defaultLineKeys,
    effectiveHeaderColumnWidths,
    effectiveLineColumnWidths,
  ]);

  // Pas een opgeslagen kolomlayout toe (alleen in-memory; niet persistent in
  // board-settings). Onbekende keys worden genegeerd, nieuwe kolommen sluiten aan.
  const applyColumnLayout = useCallback((layout) => {
    if (!layout || typeof layout !== 'object') return;
    if (Array.isArray(layout.visibleColumns)) {
      setVisibleColumnKeys(normalizeVisibleColumns(layout.visibleColumns, defaultHeaderKeys));
    }
    if (Array.isArray(layout.columnOrder)) {
      setColumnOrder(normalizeColumnOrder(layout.columnOrder, defaultHeaderKeys));
    }
    if (Array.isArray(layout.lineColumnOrder)) {
      setLineColumnOrder(normalizeColumnOrder(layout.lineColumnOrder, defaultLineKeys));
    }
    if (layout.headerColumnWidths && typeof layout.headerColumnWidths === 'object') {
      setHeaderColumnWidths(normalizeColumnWidths(layout.headerColumnWidths, defaultHeaderKeys));
    }
    if (layout.lineColumnWidths && typeof layout.lineColumnWidths === 'object') {
      setLineColumnWidths(normalizeColumnWidths(layout.lineColumnWidths, defaultLineKeys));
    }
  }, [defaultHeaderKeys, defaultLineKeys]);

  const saveHeaderColumnWidth = useCallback(async (columnKey, width) => {
    if (!columnKey) return;
    const nextHeaderWidths = normalizeColumnWidths(
      { ...effectiveHeaderColumnWidths, [columnKey]: width },
      defaultHeaderKeys
    );
    await persistBoardSettings({ nextHeaderWidths });
  }, [effectiveHeaderColumnWidths, defaultHeaderKeys, persistBoardSettings]);

  const saveLineColumnWidth = useCallback(async (columnKey, width) => {
    if (!columnKey) return;
    const nextLineWidths = normalizeColumnWidths(
      { ...effectiveLineColumnWidths, [columnKey]: width },
      defaultLineKeys
    );
    await persistBoardSettings({ nextLineWidths });
  }, [effectiveLineColumnWidths, defaultLineKeys, persistBoardSettings]);

  const reorderHeaderColumn = useCallback(async (sourceKey, targetKey, position = 'before') => {
    if (!sourceKey || !targetKey) return;
    const currentOrder = normalizeColumnOrder(columnOrder, defaultHeaderKeys);
    const nextOrder = moveColumnKey(currentOrder, defaultHeaderKeys, sourceKey, targetKey, position, effectiveVisibleKeys);
    if (arraysEqual(currentOrder, nextOrder)) return;
    await persistBoardSettings({ nextHeaderOrder: nextOrder });
  }, [columnOrder, defaultHeaderKeys, effectiveVisibleKeys, persistBoardSettings]);

  const reorderLineColumn = useCallback(async (sourceKey, targetKey, position = 'before') => {
    if (!sourceKey || !targetKey) return;
    const currentOrder = normalizeColumnOrder(lineColumnOrder, defaultLineKeys);
    const nextOrder = moveColumnKey(currentOrder, defaultLineKeys, sourceKey, targetKey, position);
    if (arraysEqual(currentOrder, nextOrder)) return;
    await persistBoardSettings({ nextLineOrder: nextOrder });
  }, [lineColumnOrder, defaultLineKeys, persistBoardSettings]);

  // Verplaats een net-aangemaakte kolom naar rechts van zijn bron zodra beide keys
  // in de (herladen) kolomdefinities bestaan.
  useEffect(() => {
    if (!pendingInsertAfter) return;
    const { newKey, afterKey } = pendingInsertAfter;
    if (!defaultHeaderKeys.includes(newKey) || !defaultHeaderKeys.includes(afterKey)) return;
    setPendingInsertAfter(null);
    reorderHeaderColumn(newKey, afterKey, 'after');
  }, [pendingInsertAfter, defaultHeaderKeys, reorderHeaderColumn]);

  return useMemo(() => ({
    orders,
    headerColumns,
    lineColumns: orderedLineColumns,
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
    headerColumnWidths: effectiveHeaderColumnWidths,
    lineColumnWidths: effectiveLineColumnWidths,
    savingColumns,
    refresh,
    markViewed,
    deleteRows,
    saveValue,
    correctField,
    toggleWriteback,
    addColumn,
    addHeaderColumnAfter,
    renameColumn,
    removeColumn,
    saveVisibleColumns,
    reorderHeaderColumn,
    reorderLineColumn,
    saveHeaderColumnWidth,
    saveLineColumnWidth,
    exportColumnLayout,
    applyColumnLayout,
  }), [
    orders,
    headerColumns,
    orderedLineColumns,
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
    effectiveHeaderColumnWidths,
    effectiveLineColumnWidths,
    savingColumns,
    refresh,
    markViewed,
    deleteRows,
    saveValue,
    correctField,
    toggleWriteback,
    addColumn,
    addHeaderColumnAfter,
    renameColumn,
    removeColumn,
    saveVisibleColumns,
    reorderHeaderColumn,
    reorderLineColumn,
    saveHeaderColumnWidth,
    saveLineColumnWidth,
    exportColumnLayout,
    applyColumnLayout,
  ]);
}
