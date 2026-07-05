import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';
import { getCachedPurchaseOrdersView, setCachedPurchaseOrdersView } from '../utils/purchaseOrdersViewCache';
import { BOARD_TB_SOURCE } from '../config/featureFlags';

const BOARD_KEY = 'purchase-orders';
const MIN_COLUMN_WIDTH = 80;
const MAX_COLUMN_WIDTH = 1000;

// Board-cutover Fase 7 (#AB:176): endpoints + response-shape-mapping tussen de generieke tb_*-laag
// (/api/data/purchase-orders) en de po_*-vorm die de board-componenten verwachten. Achter BOARD_TB_SOURCE.
const DATA_BASE = '/data/purchase-orders';
const PO_BASE = '/purchase-orders';
const boardBase = () => (BOARD_TB_SOURCE ? DATA_BASE : PO_BASE);

// tb_*-read → board-shape: rows→orders, meta.columns.master|detail→columns.header|line,
// partitionKey→dataAreaId, recordKey→orderNumber, detailKey→lineNumber, details→lines,
// detailCount→lineCount, removedAtSource→removedInD365. Overige velden passeren ongewijzigd.
function mapTbResponseToBoard(data) {
  if (!data || typeof data !== 'object') return data;
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const master = Array.isArray(data?.meta?.columns?.master) ? data.meta.columns.master : [];
  const detail = Array.isArray(data?.meta?.columns?.detail) ? data.meta.columns.detail : [];
  return {
    ...data,
    orders: rows.map((r) => ({
      dataAreaId: r.partitionKey,
      orderNumber: r.recordKey,
      values: r.values || {},
      isNew: Boolean(r.isNew),
      isChanged: Boolean(r.isChanged),
      removedInD365: Boolean(r.removedAtSource),
      lineCount: Number(r.detailCount) || 0,
      lines: (Array.isArray(r.details) ? r.details : []).map((d) => ({
        lineNumber: d.detailKey,
        values: d.values || {},
      })),
    })),
    columns: { header: master, line: detail },
  };
}

// tb_*-kolommen leveren scope master|detail; de board-hook denkt in header|line.
const scopeForLevel = (level) => (level === 'line' ? 'detail' : 'master');

// AANNAME: De nieuwe SQL-backed API levert alle data (orders + dynamische kolommen)
// in één GET-call onder /purchase-orders (NIET onder /supplier). De tabelpagina
// leest bij openen altijd uit SQL-cache; D365-refresh is expliciet handmatig.

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

function normalizeSelectedColumns(rawKeys, allowedKeys) {
  if (!Array.isArray(rawKeys) || !rawKeys.length) return [];
  const allowed = Array.isArray(allowedKeys) && allowedKeys.length ? new Set(allowedKeys) : null;
  const unique = Array.from(new Set(rawKeys.map((key) => String(key || '').trim()).filter(Boolean)));
  return allowed ? unique.filter((key) => allowed.has(key)) : unique;
}

function normalizeLineTotalLinks(rawLinks, allowedLineKeys, allowedHeaderKeys) {
  if (!Array.isArray(rawLinks) || !rawLinks.length) return [];
  const allowedLineSet = Array.isArray(allowedLineKeys) && allowedLineKeys.length
    ? new Set(allowedLineKeys)
    : null;
  const allowedHeaderSet = Array.isArray(allowedHeaderKeys) && allowedHeaderKeys.length
    ? new Set(allowedHeaderKeys)
    : null;
  const seen = new Set();
  return rawLinks.reduce((acc, entry) => {
    if (!entry || typeof entry !== 'object') return acc;
    const lineColumnKey = String(entry.lineColumnKey || '').trim();
    const headerColumnKey = String(entry.headerColumnKey || '').trim();
    if (!lineColumnKey || !headerColumnKey) return acc;
    if (allowedLineSet && !allowedLineSet.has(lineColumnKey)) return acc;
    if (allowedHeaderSet && !allowedHeaderSet.has(headerColumnKey)) return acc;
    const signature = `${lineColumnKey}|${headerColumnKey}`;
    if (seen.has(signature)) return acc;
    seen.add(signature);
    acc.push({ lineColumnKey, headerColumnKey });
    return acc;
  }, []);
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
  const [lineTotalColumns, setLineTotalColumns] = useState([]);
  const [lineTotalHeaderLinks, setLineTotalHeaderLinks] = useState([]);
  const [lineValueHeaderLinks, setLineValueHeaderLinks] = useState([]);
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
      const base = boardBase();
      const endpoint = autoRefresh ? `${base}?autoRefresh=1` : base;
      const raw = await apiRequest(endpoint);
      const data = BOARD_TB_SOURCE ? mapTbResponseToBoard(raw) : raw;
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

  // Lichte her-lees uit de SQL-cache (geen D365-refresh), bv. nadat een verborgen rij
  // is teruggezet zodat hij weer in het overzicht verschijnt.
  const reload = useCallback(() => loadPurchaseOrders({ skipLoading: true }), [loadPurchaseOrders]);

  const loadBoardSettings = useCallback(async () => {
    try {
      const data = await apiRequest('/supplier/board-settings/' + BOARD_KEY);
      const settings = data?.settings || null;
      setVisibleColumnKeys(Array.isArray(settings?.visibleColumns) ? settings.visibleColumns : []);
      setColumnOrder(Array.isArray(settings?.columnOrder) ? settings.columnOrder : []);
      setLineColumnOrder(Array.isArray(settings?.lineColumnOrder) ? settings.lineColumnOrder : []);
      setHeaderColumnWidths(normalizeColumnWidths(settings?.headerColumnWidths));
      setLineColumnWidths(normalizeColumnWidths(settings?.lineColumnWidths));
      setLineTotalColumns(Array.isArray(settings?.lineTotalColumns) ? settings.lineTotalColumns : []);
      setLineTotalHeaderLinks(Array.isArray(settings?.lineTotalHeaderLinks) ? settings.lineTotalHeaderLinks : []);
      setLineValueHeaderLinks(Array.isArray(settings?.lineValueHeaderLinks) ? settings.lineValueHeaderLinks : []);
    } catch {
      // Board-settings zijn optioneel; bij afwezigheid blijven alle kolommen zichtbaar.
      setVisibleColumnKeys([]);
      setColumnOrder([]);
      setLineColumnOrder([]);
      setHeaderColumnWidths({});
      setLineColumnWidths({});
      setLineTotalColumns([]);
      setLineTotalHeaderLinks([]);
      setLineValueHeaderLinks([]);
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
      if (!active) return;
      await loadPurchaseOrders({ skipLoading: hasCachedData, autoRefresh: false });
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
      const raw = await apiRequest(`${boardBase()}/refresh`, { method: 'POST' });
      applyData(BOARD_TB_SOURCE ? mapTbResponseToBoard(raw) : raw);
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
      await apiRequest(`${boardBase()}/viewed`, { method: 'POST' });
      const raw = await apiRequest(boardBase());
      applyData(BOARD_TB_SOURCE ? mapTbResponseToBoard(raw) : raw);
    } catch (err) {
      setError(err.message);
    } finally {
      setMarkingViewed(false);
    }
  }, [applyData]);

  // Bulk "verwijderen": verberg de geselecteerde rijen (SQL-only exclusion, geen D365-mutatie).
  // Optimistic: rijen verdwijnen direct; bij een API-fout wordt de vorige lijst teruggezet.
  const deleteRows = useCallback(async (rows) => {
    // Fase 2 (#AB:171): row-exclusions op tb_*. De guard uit #176 is vervangen door de echte call.
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
      // tb_*-exclude verwacht {partitionKey, recordKey}; po_* verwacht de order-vorm.
      const body = BOARD_TB_SOURCE
        ? { rows: targets.map((r) => ({ partitionKey: r.dataAreaId, recordKey: r.orderNumber })) }
        : { rows: targets };
      await apiRequest(`${boardBase()}/rows/exclude`, { method: 'POST', body });
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
      if (BOARD_TB_SOURCE) {
        await apiRequest(`${DATA_BASE}/value`, {
          method: 'PUT',
          body: {
            columnId,
            partitionKey: dataAreaId,
            recordKey: orderNumber,
            detailKey: isLine ? lineNumber : null,
            value,
          },
        });
      } else {
        await apiRequest('/purchase-orders/values', {
          method: 'PUT',
          body: { columnId, dataAreaId, orderNumber, lineNumber: isLine ? lineNumber : null, value },
        });
      }
    } catch (err) {
      // Rollback bij fout.
      if (previousOrders) setOrders(previousOrders);
      throw err;
    }
  }, []);

  // D365-veldcorrectie terugschrijven (#134). Optimistic; bij fout terugdraaien + fout doorgeven.
  const correctField = useCallback(async ({ columnId, columnKey, dataAreaId, orderNumber, lineNumber, value, basedOnValue }) => {
    // Fase 7 (#AB:176): write-back naar D365 is nog niet mee-gecutoverd (Fase 3 #172 op tb_*).
    if (BOARD_TB_SOURCE) {
      throw new Error('Terugschrijven naar D365 is nog niet beschikbaar op het nieuwe board (volgt in Fase 3).');
    }
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
    const [headerData, lineData] = BOARD_TB_SOURCE
      ? await Promise.all([
          apiRequest(`${DATA_BASE}/columns?scope=master`),
          apiRequest(`${DATA_BASE}/columns?scope=detail`),
        ])
      : await Promise.all([
          apiRequest('/purchase-orders/columns?level=header'),
          apiRequest('/purchase-orders/columns?level=line'),
        ]);
    setHeaderColumns(Array.isArray(headerData?.columns) ? headerData.columns : []);
    setLineColumns(Array.isArray(lineData?.columns) ? lineData.columns : []);
  }, []);

  const addColumn = useCallback(async ({ label, level, dataType, options }) => {
    const body = BOARD_TB_SOURCE
      ? { scope: scopeForLevel(level), label, dataType }
      : { label, level, dataType };
    if (options !== undefined) {
      body.options = options;
    }
    const res = await apiRequest(`${boardBase()}/columns`, { method: 'POST', body });
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
    await apiRequest(`${boardBase()}/columns/${id}`, { method: 'PATCH', body: { label } });
    await reloadColumns();
  }, [reloadColumns]);

  // Admin: zet write-back aan/uit op een D365-kolom (#134).
  const toggleWriteback = useCallback(async (columnId, writable) => {
    // Fase 1 (#AB:170) leverde de tb_*-writeback-config; de guard uit #176 is vervangen door de echte call.
    await apiRequest(`${boardBase()}/columns/${columnId}/writeback`, {
      method: 'PATCH',
      body: { writable, mechanism: 'patch' },
    });
    await reloadColumns();
  }, [reloadColumns]);

  const removeColumn = useCallback(async (id) => {
    await apiRequest(`${boardBase()}/columns/${id}`, { method: 'DELETE' });
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

  const effectiveLineTotalColumns = useMemo(
    () => normalizeSelectedColumns(lineTotalColumns, defaultLineKeys),
    [lineTotalColumns, defaultLineKeys]
  );
  const effectiveLineTotalHeaderLinks = useMemo(
    () => normalizeLineTotalLinks(lineTotalHeaderLinks, defaultLineKeys, defaultHeaderKeys),
    [lineTotalHeaderLinks, defaultLineKeys, defaultHeaderKeys]
  );
  const effectiveLineValueHeaderLinks = useMemo(
    () => normalizeLineTotalLinks(lineValueHeaderLinks, defaultLineKeys, defaultHeaderKeys),
    [lineValueHeaderLinks, defaultLineKeys, defaultHeaderKeys]
  );

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
    nextLineTotalColumns = lineTotalColumns,
    nextLineTotalHeaderLinks = lineTotalHeaderLinks,
    nextLineValueHeaderLinks = lineValueHeaderLinks,
  } = {}) => {
    const normalizedVisible = normalizeVisibleColumns(nextVisibleKeys, defaultHeaderKeys);
    const normalizedHeaderOrder = normalizeColumnOrder(nextHeaderOrder, defaultHeaderKeys);
    const normalizedLineOrder = normalizeColumnOrder(nextLineOrder, defaultLineKeys);
    const normalizedHeaderWidths = normalizeColumnWidths(nextHeaderWidths, defaultHeaderKeys);
    const normalizedLineWidths = normalizeColumnWidths(nextLineWidths, defaultLineKeys);
    const normalizedLineTotalColumns = normalizeSelectedColumns(nextLineTotalColumns, defaultLineKeys);
    const normalizedLineTotalHeaderLinks = normalizeLineTotalLinks(
      nextLineTotalHeaderLinks,
      defaultLineKeys
    );
    const normalizedLineValueHeaderLinks = normalizeLineTotalLinks(
      nextLineValueHeaderLinks,
      defaultLineKeys
    );

    setVisibleColumnKeys(normalizedVisible);
    setColumnOrder(normalizedHeaderOrder);
    setLineColumnOrder(normalizedLineOrder);
    setHeaderColumnWidths(normalizedHeaderWidths);
    setLineColumnWidths(normalizedLineWidths);
    setLineTotalColumns(normalizedLineTotalColumns);
    setLineTotalHeaderLinks(normalizedLineTotalHeaderLinks);
    setLineValueHeaderLinks(normalizedLineValueHeaderLinks);
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
            lineTotalColumns: normalizedLineTotalColumns,
            lineTotalHeaderLinks: normalizedLineTotalHeaderLinks,
            lineValueHeaderLinks: normalizedLineValueHeaderLinks,
          },
        },
      });
    } finally {
      setSavingColumns(false);
    }
  }, [visibleColumnKeys, columnOrder, lineColumnOrder, headerColumnWidths, lineColumnWidths, lineTotalColumns, lineTotalHeaderLinks, lineValueHeaderLinks, defaultHeaderKeys, defaultLineKeys]);

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
    lineTotalColumns: effectiveLineTotalColumns,
    lineTotalHeaderLinks: effectiveLineTotalHeaderLinks,
    lineValueHeaderLinks: effectiveLineValueHeaderLinks,
  }), [
    effectiveVisibleKeys,
    columnOrder,
    defaultHeaderKeys,
    lineColumnOrder,
    defaultLineKeys,
    effectiveHeaderColumnWidths,
    effectiveLineColumnWidths,
    effectiveLineTotalColumns,
    effectiveLineTotalHeaderLinks,
    effectiveLineValueHeaderLinks,
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
    if (Array.isArray(layout.lineTotalColumns)) {
      setLineTotalColumns(normalizeSelectedColumns(layout.lineTotalColumns, defaultLineKeys));
    }
    if (Array.isArray(layout.lineTotalHeaderLinks)) {
      setLineTotalHeaderLinks(normalizeLineTotalLinks(layout.lineTotalHeaderLinks, defaultLineKeys));
    }
    if (Array.isArray(layout.lineValueHeaderLinks)) {
      setLineValueHeaderLinks(normalizeLineTotalLinks(layout.lineValueHeaderLinks, defaultLineKeys));
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

  const setLineColumnTotal = useCallback(async (columnKey, enabled) => {
    const key = String(columnKey || '').trim();
    if (!key) return;
    const nextSet = new Set(effectiveLineTotalColumns);
    if (enabled) nextSet.add(key);
    else nextSet.delete(key);
    await persistBoardSettings({ nextLineTotalColumns: Array.from(nextSet) });
  }, [effectiveLineTotalColumns, persistBoardSettings]);

  const addLineTotalHeaderLink = useCallback(async ({ lineColumnKey, headerColumnKey }) => {
    const lineKey = String(lineColumnKey || '').trim();
    const headerKey = String(headerColumnKey || '').trim();
    if (!lineKey || !headerKey) return;
    const nextLinks = normalizeLineTotalLinks(
      [...lineTotalHeaderLinks, { lineColumnKey: lineKey, headerColumnKey: headerKey }],
      defaultLineKeys
    );
    await persistBoardSettings({ nextLineTotalHeaderLinks: nextLinks });
  }, [lineTotalHeaderLinks, defaultLineKeys, persistBoardSettings]);

  const addLineValueHeaderLink = useCallback(async ({ lineColumnKey, headerColumnKey }) => {
    const lineKey = String(lineColumnKey || '').trim();
    const headerKey = String(headerColumnKey || '').trim();
    if (!lineKey || !headerKey) return;
    const nextLinks = normalizeLineTotalLinks(
      [...lineValueHeaderLinks, { lineColumnKey: lineKey, headerColumnKey: headerKey }],
      defaultLineKeys
    );
    await persistBoardSettings({ nextLineValueHeaderLinks: nextLinks });
  }, [lineValueHeaderLinks, defaultLineKeys, persistBoardSettings]);

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
    lineTotalColumns: effectiveLineTotalColumns,
    lineTotalHeaderLinks: effectiveLineTotalHeaderLinks,
    lineValueHeaderLinks: effectiveLineValueHeaderLinks,
    savingColumns,
    refresh,
    reload,
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
    setLineColumnTotal,
    addLineTotalHeaderLink,
    addLineValueHeaderLink,
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
    effectiveLineTotalColumns,
    effectiveLineTotalHeaderLinks,
    effectiveLineValueHeaderLinks,
    savingColumns,
    refresh,
    reload,
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
    setLineColumnTotal,
    addLineTotalHeaderLink,
    addLineValueHeaderLink,
    saveHeaderColumnWidth,
    saveLineColumnWidth,
    exportColumnLayout,
    applyColumnLayout,
  ]);
}
