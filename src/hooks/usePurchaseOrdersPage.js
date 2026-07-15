import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { getCachedPurchaseOrdersView, setCachedPurchaseOrdersView } from '../utils/purchaseOrdersViewCache';
import { BOARD_TB_SOURCE } from '../config/featureFlags';
import { migrateFormatRulesForStatusRenames, normalizeColumnFormatRulesMap } from '../components/supplier/columnFormatRuleUtils';
import { buildStatusLabelRenames } from '../utils/statusColumnUtils';
import { mapTbColumnToBoard, mapTbResponseToBoard, scopeForLevel } from '../utils/purchaseOrdersBoardMapping';
import { filterSummableLineColumnKeys, isSummableLineColumn } from '../utils/purchaseOrderTotals';
import {
  arraysEqual,
  mergeColumnTextStyle,
  moveColumnKey,
  normalizeColumnOrder,
  normalizeColumnTextStyleMap,
  normalizeColumnWidths,
  normalizeLineTotalLinks,
  normalizeSelectedColumns,
  normalizeVisibleColumns,
} from '../utils/boardColumnSettings';
import {
  PRODUCT_IMAGE_COLUMN_KEY,
  applyProductImageColumnWidth,
  createProductImageColumn,
  extendDefaultColumnKeys,
  mergeProductImageColumnWidths,
} from '../utils/purchaseOrderProductImageColumn';

const BOARD_KEY = 'purchase-orders';

// Optimistische track-change update: zet de meest rechter stip (huidige sessie/week,
// offset 0 = laatste teken) direct op rood na een celwijziging, zonder board-herlaad.
// Retourneert dezelfde map-referentie als er niets verandert (kolom niet getrackt).
function withRightmostMarkRed(existingMarks, columnId, meta) {
  const colKey = String(columnId);
  const activeMap = meta?.activeOffsetByColumnId || {};
  if (!Object.prototype.hasOwnProperty.call(activeMap, colKey)) return existingMarks;
  const base = existingMarks?.[colKey] ?? meta?.defaultPattern?.[colKey];
  if (typeof base !== 'string' || base.length === 0) return existingMarks;
  const next = `${base.slice(0, -1)}r`;
  if (next === existingMarks?.[colKey]) return existingMarks;
  return { ...(existingMarks || {}), [colKey]: next };
}

// Board-cutover Fase 7 (#AB:176): endpoints van de generieke tb_*-laag versus de
// oorspronkelijke po_*-laag. Shape-mapping zit in utils/purchaseOrdersBoardMapping.
const DATA_BASE = '/data/purchase-orders';
const PO_BASE = '/purchase-orders';
const boardBase = () => (BOARD_TB_SOURCE ? DATA_BASE : PO_BASE);

// AANNAME: De nieuwe SQL-backed API levert alle data (orders + dynamische kolommen)
// in één GET-call onder /purchase-orders (NIET onder /supplier). De tabelpagina
// leest bij openen altijd uit SQL-cache; D365-refresh is expliciet handmatig.

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
  // Track-changes-meta uit de board-read (null = feature globaal uit) (#AB:217)
  const [trackChangesMeta, setTrackChangesMeta] = useState(null);
  // Ref zodat save/correct de actuele meta kunnen lezen zonder in hun deps te zitten.
  const trackChangesMetaRef = useRef(null);
  useEffect(() => {
    trackChangesMetaRef.current = trackChangesMeta;
  }, [trackChangesMeta]);

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
  const [headerColumnTextStyles, setHeaderColumnTextStyles] = useState({});
  const [headerColumnFormatRules, setHeaderColumnFormatRules] = useState({});
  const [lineColumnTextStyles, setLineColumnTextStyles] = useState({});
  const [lineColumnFormatRules, setLineColumnFormatRules] = useState({});
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
    setTrackChangesMeta(data?.meta?.trackChanges ?? null);
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
      setHeaderColumnTextStyles(normalizeColumnTextStyleMap(settings?.headerColumnTextStyles));
      setHeaderColumnFormatRules(normalizeColumnFormatRulesMap(settings?.headerColumnFormatRules));
      setLineColumnTextStyles(normalizeColumnTextStyleMap(settings?.lineColumnTextStyles));
      setLineColumnFormatRules(normalizeColumnFormatRulesMap(settings?.lineColumnFormatRules));
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
      setHeaderColumnTextStyles({});
      setHeaderColumnFormatRules({});
      setLineColumnTextStyles({});
      setLineColumnFormatRules({});
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

  // Start een D365-refresh op de achtergrond; de tabeldata blijft staan tot expliciete reload.
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      return await apiRequest(`${boardBase()}/refresh/start`, { method: 'POST' });
    } catch (err) {
      setError(err.message);
      setRefreshing(false);
      return null;
    }
  }, []);

  const finishRefresh = useCallback(() => {
    setRefreshing(false);
  }, []);

  const setRefreshError = useCallback((message) => {
    if (!message) return;
    setError(String(message));
  }, []);

  const reloadAfterRefresh = useCallback(async () => {
    try {
      await loadPurchaseOrders({ skipLoading: true, autoRefresh: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [loadPurchaseOrders]);

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
    const meta = trackChangesMetaRef.current;
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
                ? {
                    ...line,
                    values: { ...line.values, [columnKey]: value },
                    trackMarksByColumnId: withRightmostMarkRed(line.trackMarksByColumnId, columnId, meta),
                  }
                : line
            ),
          };
        }
        return {
          ...order,
          values: { ...order.values, [columnKey]: value },
          trackMarksByColumnId: withRightmostMarkRed(order.trackMarksByColumnId, columnId, meta),
        };
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
    // Fase 3 (#AB:172): write-back naar D365 op tb_*. De guard uit #176 is vervangen door de echte call.
    const isLine = lineNumber !== null && lineNumber !== undefined;
    const meta = trackChangesMetaRef.current;
    let previousOrders = null;
    setOrders((prev) => {
      previousOrders = prev;
      return prev.map((order) => {
        if (order.dataAreaId !== dataAreaId || order.orderNumber !== orderNumber) return order;
        if (isLine) {
          return {
            ...order,
            lines: (order.lines || []).map((line) =>
              line.lineNumber === lineNumber
                ? {
                    ...line,
                    values: { ...line.values, [columnKey]: value },
                    trackMarksByColumnId: withRightmostMarkRed(line.trackMarksByColumnId, columnId, meta),
                  }
                : line
            ),
          };
        }
        return {
          ...order,
          values: { ...order.values, [columnKey]: value },
          trackMarksByColumnId: withRightmostMarkRed(order.trackMarksByColumnId, columnId, meta),
        };
      });
    });
    try {
      if (BOARD_TB_SOURCE) {
        await apiRequest(`${DATA_BASE}/correct`, {
          method: 'POST',
          body: { columnId, partitionKey: dataAreaId, recordKey: orderNumber, detailKey: isLine ? lineNumber : null, value, basedOnValue },
        });
      } else {
        await apiRequest('/purchase-orders/correct', {
          method: 'POST',
          body: { columnId, dataAreaId, orderNumber, lineNumber: isLine ? lineNumber : null, value, basedOnValue },
        });
      }
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
    if (BOARD_TB_SOURCE) {
      setHeaderColumns(Array.isArray(headerData?.columns) ? headerData.columns.map(mapTbColumnToBoard) : []);
      setLineColumns(Array.isArray(lineData?.columns) ? lineData.columns.map(mapTbColumnToBoard) : []);
      return;
    }
    setHeaderColumns(Array.isArray(headerData?.columns) ? headerData.columns : []);
    setLineColumns(Array.isArray(lineData?.columns) ? lineData.columns : []);
  }, []);

  const addColumn = useCallback(async ({ label, level, dataType, options, formulaExpr }) => {
    const body = BOARD_TB_SOURCE
      ? { scope: scopeForLevel(level), label, dataType }
      : { label, level, dataType };
    if (options !== undefined) {
      body.options = options;
    }
    if (formulaExpr !== undefined && BOARD_TB_SOURCE) {
      body.formulaExpr = formulaExpr;
    }
    const res = await apiRequest(`${boardBase()}/columns`, { method: 'POST', body });
    if (formulaExpr !== undefined && BOARD_TB_SOURCE) {
      await reload();
    } else {
      await reloadColumns();
    }
    return res?.column || null;
  }, [reload, reloadColumns]);

  // Monday-stijl: voeg een header-kolom toe direct rechts van een bestaande kolom.
  // De nieuwe kolom wordt aangemaakt (achteraan), waarna een effect hem naar de juiste
  // plek verplaatst zodra hij in de kolomdefinities verschijnt (async na reload).
  const addHeaderColumnAfter = useCallback(async (afterKey, { label, dataType, options, formulaExpr }) => {
    const created = await addColumn({ label, level: 'header', dataType, options, formulaExpr });
    if (created?.key && afterKey) {
      setPendingInsertAfter({ newKey: created.key, afterKey });
    }
    return created;
  }, [addColumn]);

  const updateFormulaColumn = useCallback(async (id, { label, dataType, formulaExpr }) => {
    await apiRequest(`${boardBase()}/columns/${id}`, {
      method: 'PATCH',
      body: { label, dataType, formulaExpr },
    });
    await reload();
  }, [reload]);

  const renameColumn = useCallback(async (id, label, patch = null) => {
    const body = {};
    if (label !== undefined) body.label = label;
    if (patch && typeof patch === 'object') {
      if (patch.dataType !== undefined) body.dataType = patch.dataType;
      if (patch.options !== undefined) body.options = patch.options;
    }
    if (!body.label && !body.options && !body.dataType) {
      body.label = label;
    }
    await apiRequest(`${boardBase()}/columns/${id}`, { method: 'PATCH', body });
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
    () => extendDefaultColumnKeys(headerColumns.map((column) => column.key)),
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
      .filter((key) => {
        if (key === PRODUCT_IMAGE_COLUMN_KEY) return true;
        return byKey.has(key) && effectiveVisibleKeys.includes(key);
      })
      .map((key) => (key === PRODUCT_IMAGE_COLUMN_KEY
        ? createProductImageColumn('header')
        : byKey.get(key)));
  }, [headerColumns, columnOrder, defaultHeaderKeys, effectiveVisibleKeys]);

  const defaultLineKeys = useMemo(
    () => extendDefaultColumnKeys(lineColumns.map((column) => column.key)),
    [lineColumns]
  );

  const orderedLineColumns = useMemo(() => {
    const byKey = new Map(lineColumns.map((column) => [column.key, column]));
    const order = normalizeColumnOrder(lineColumnOrder, defaultLineKeys);
    return order
      .filter((key) => key === PRODUCT_IMAGE_COLUMN_KEY || byKey.has(key))
      .map((key) => (key === PRODUCT_IMAGE_COLUMN_KEY
        ? createProductImageColumn('line')
        : byKey.get(key)));
  }, [lineColumns, lineColumnOrder, defaultLineKeys]);

  const effectiveLineTotalColumns = useMemo(
    () => filterSummableLineColumnKeys(
      normalizeSelectedColumns(lineTotalColumns, defaultLineKeys),
      lineColumns
    ),
    [lineTotalColumns, defaultLineKeys, lineColumns]
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
    () => mergeProductImageColumnWidths(
      normalizeColumnWidths(headerColumnWidths, defaultHeaderKeys)
    ),
    [headerColumnWidths, defaultHeaderKeys]
  );
  const effectiveLineColumnWidths = useMemo(
    () => mergeProductImageColumnWidths(
      normalizeColumnWidths(lineColumnWidths, defaultLineKeys)
    ),
    [lineColumnWidths, defaultLineKeys]
  );
  const effectiveHeaderColumnTextStyles = useMemo(
    () => normalizeColumnTextStyleMap(headerColumnTextStyles, defaultHeaderKeys),
    [headerColumnTextStyles, defaultHeaderKeys]
  );
  const effectiveHeaderColumnFormatRules = useMemo(
    () => normalizeColumnFormatRulesMap(headerColumnFormatRules, defaultHeaderKeys),
    [headerColumnFormatRules, defaultHeaderKeys]
  );
  const effectiveLineColumnTextStyles = useMemo(
    () => normalizeColumnTextStyleMap(lineColumnTextStyles, defaultLineKeys),
    [lineColumnTextStyles, defaultLineKeys]
  );
  const effectiveLineColumnFormatRules = useMemo(
    () => normalizeColumnFormatRulesMap(lineColumnFormatRules, defaultLineKeys),
    [lineColumnFormatRules, defaultLineKeys]
  );

  const persistBoardSettings = useCallback(async ({
    nextVisibleKeys = visibleColumnKeys,
    nextHeaderOrder = columnOrder,
    nextLineOrder = lineColumnOrder,
    nextHeaderWidths = headerColumnWidths,
    nextLineWidths = lineColumnWidths,
    nextHeaderTextStyles = headerColumnTextStyles,
    nextHeaderFormatRules = headerColumnFormatRules,
    nextLineTextStyles = lineColumnTextStyles,
    nextLineFormatRules = lineColumnFormatRules,
    nextLineTotalColumns = lineTotalColumns,
    nextLineTotalHeaderLinks = lineTotalHeaderLinks,
    nextLineValueHeaderLinks = lineValueHeaderLinks,
  } = {}) => {
    const normalizedVisible = normalizeVisibleColumns(nextVisibleKeys, defaultHeaderKeys);
    const normalizedHeaderOrder = normalizeColumnOrder(nextHeaderOrder, defaultHeaderKeys);
    const normalizedLineOrder = normalizeColumnOrder(nextLineOrder, defaultLineKeys);
    const normalizedHeaderWidths = normalizeColumnWidths(nextHeaderWidths, defaultHeaderKeys);
    const normalizedLineWidths = normalizeColumnWidths(nextLineWidths, defaultLineKeys);
    const normalizedHeaderTextStyles = normalizeColumnTextStyleMap(nextHeaderTextStyles, defaultHeaderKeys);
    const normalizedHeaderFormatRules = normalizeColumnFormatRulesMap(nextHeaderFormatRules, defaultHeaderKeys);
    const normalizedLineTextStyles = normalizeColumnTextStyleMap(nextLineTextStyles, defaultLineKeys);
    const normalizedLineFormatRules = normalizeColumnFormatRulesMap(nextLineFormatRules, defaultLineKeys);
    const normalizedLineTotalColumns = filterSummableLineColumnKeys(
      normalizeSelectedColumns(nextLineTotalColumns, defaultLineKeys),
      lineColumns
    );
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
    setHeaderColumnTextStyles(normalizedHeaderTextStyles);
    setHeaderColumnFormatRules(normalizedHeaderFormatRules);
    setLineColumnTextStyles(normalizedLineTextStyles);
    setLineColumnFormatRules(normalizedLineFormatRules);
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
            headerColumnTextStyles: normalizedHeaderTextStyles,
            headerColumnFormatRules: normalizedHeaderFormatRules,
            lineColumnTextStyles: normalizedLineTextStyles,
            lineColumnFormatRules: normalizedLineFormatRules,
            lineTotalColumns: normalizedLineTotalColumns,
            lineTotalHeaderLinks: normalizedLineTotalHeaderLinks,
            lineValueHeaderLinks: normalizedLineValueHeaderLinks,
          },
        },
      });
    } finally {
      setSavingColumns(false);
    }
  }, [
    visibleColumnKeys,
    columnOrder,
    lineColumnOrder,
    headerColumnWidths,
    lineColumnWidths,
    headerColumnTextStyles,
    headerColumnFormatRules,
    lineColumnTextStyles,
    lineColumnFormatRules,
    lineTotalColumns,
    lineTotalHeaderLinks,
    lineValueHeaderLinks,
    defaultHeaderKeys,
    defaultLineKeys,
    lineColumns,
  ]);

  const updateStatusOptions = useCallback(async (columnId, options, columnLabel) => {
    const headerColumn = headerColumns.find((column) => column.id === columnId);
    const lineColumn = lineColumns.find((column) => column.id === columnId);
    const targetColumn = headerColumn || lineColumn;
    const previousOptions = targetColumn?.options;
    const columnKey = targetColumn?.key;
    const renames = buildStatusLabelRenames(previousOptions, options);

    await renameColumn(columnId, columnLabel, { options });

    if (columnKey && renames.length) {
      const persistPayload = {};
      if (headerColumn) {
        persistPayload.nextHeaderFormatRules = migrateFormatRulesForStatusRenames(
          effectiveHeaderColumnFormatRules,
          columnKey,
          renames
        );
      }
      if (lineColumn) {
        persistPayload.nextLineFormatRules = migrateFormatRulesForStatusRenames(
          effectiveLineColumnFormatRules,
          columnKey,
          renames
        );
      }
      if (Object.keys(persistPayload).length) {
        await persistBoardSettings(persistPayload);
      }
    }

    await reload();
  }, [
    renameColumn,
    reload,
    headerColumns,
    lineColumns,
    effectiveHeaderColumnFormatRules,
    effectiveLineColumnFormatRules,
    persistBoardSettings,
  ]);

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
    headerColumnTextStyles: effectiveHeaderColumnTextStyles,
    headerColumnFormatRules: effectiveHeaderColumnFormatRules,
    lineColumnTextStyles: effectiveLineColumnTextStyles,
    lineColumnFormatRules: effectiveLineColumnFormatRules,
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
    effectiveHeaderColumnTextStyles,
    effectiveHeaderColumnFormatRules,
    effectiveLineColumnTextStyles,
    effectiveLineColumnFormatRules,
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
    if (layout.headerColumnTextStyles && typeof layout.headerColumnTextStyles === 'object') {
      setHeaderColumnTextStyles(normalizeColumnTextStyleMap(layout.headerColumnTextStyles, defaultHeaderKeys));
    }
    if (layout.headerColumnFormatRules && typeof layout.headerColumnFormatRules === 'object') {
      setHeaderColumnFormatRules(normalizeColumnFormatRulesMap(layout.headerColumnFormatRules, defaultHeaderKeys));
    }
    if (layout.lineColumnTextStyles && typeof layout.lineColumnTextStyles === 'object') {
      setLineColumnTextStyles(normalizeColumnTextStyleMap(layout.lineColumnTextStyles, defaultLineKeys));
    }
    if (layout.lineColumnFormatRules && typeof layout.lineColumnFormatRules === 'object') {
      setLineColumnFormatRules(normalizeColumnFormatRulesMap(layout.lineColumnFormatRules, defaultLineKeys));
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
    const nextHeaderWidths = applyProductImageColumnWidth(
      columnKey,
      width,
      normalizeColumnWidths(
        { ...effectiveHeaderColumnWidths, [columnKey]: width },
        defaultHeaderKeys
      )
    );
    await persistBoardSettings({ nextHeaderWidths });
  }, [effectiveHeaderColumnWidths, defaultHeaderKeys, persistBoardSettings]);

  const saveLineColumnWidth = useCallback(async (columnKey, width) => {
    if (!columnKey) return;
    const nextLineWidths = applyProductImageColumnWidth(
      columnKey,
      width,
      normalizeColumnWidths(
        { ...effectiveLineColumnWidths, [columnKey]: width },
        defaultLineKeys
      )
    );
    await persistBoardSettings({ nextLineWidths });
  }, [effectiveLineColumnWidths, defaultLineKeys, persistBoardSettings]);

  const saveHeaderColumnTextStyle = useCallback(async (columnKey, stylePatch) => {
    const key = String(columnKey || '').trim();
    if (!key) return;
    const merged = mergeColumnTextStyle(effectiveHeaderColumnTextStyles[key], stylePatch);
    const nextHeaderTextStyles = { ...effectiveHeaderColumnTextStyles };
    if (!merged) delete nextHeaderTextStyles[key];
    else nextHeaderTextStyles[key] = merged;
    await persistBoardSettings({ nextHeaderTextStyles });
  }, [effectiveHeaderColumnTextStyles, persistBoardSettings]);

  const saveHeaderColumnFormatRules = useCallback(async (columnKey, ruleSet) => {
    const key = String(columnKey || '').trim();
    if (!key) return;
    const nextHeaderFormatRules = { ...effectiveHeaderColumnFormatRules };
    const normalizedRuleSet = normalizeColumnFormatRulesMap({ [key]: ruleSet }, defaultHeaderKeys)[key] || null;
    if (!normalizedRuleSet) {
      delete nextHeaderFormatRules[key];
      await persistBoardSettings({ nextHeaderFormatRules });
      return;
    }
    if (normalizedRuleSet.target === 'row') {
      const existingRowTarget = Object.entries(nextHeaderFormatRules).find(
        ([entryKey, entryRuleSet]) => entryKey !== key && entryRuleSet?.target === 'row'
      );
      if (existingRowTarget) {
        throw new Error('Only one column can use row-level conditional formatting.');
      }
    }
    nextHeaderFormatRules[key] = normalizedRuleSet;
    await persistBoardSettings({ nextHeaderFormatRules });
  }, [defaultHeaderKeys, effectiveHeaderColumnFormatRules, persistBoardSettings]);

  const saveLineColumnFormatRules = useCallback(async (columnKey, ruleSet) => {
    const key = String(columnKey || '').trim();
    if (!key) return;
    const nextLineFormatRules = { ...effectiveLineColumnFormatRules };
    const normalizedRuleSet = normalizeColumnFormatRulesMap({ [key]: ruleSet }, defaultLineKeys)[key] || null;
    if (!normalizedRuleSet) {
      delete nextLineFormatRules[key];
      await persistBoardSettings({ nextLineFormatRules });
      return;
    }
    if (normalizedRuleSet.target === 'row') {
      const existingRowTarget = Object.entries(nextLineFormatRules).find(
        ([entryKey, entryRuleSet]) => entryKey !== key && entryRuleSet?.target === 'row'
      );
      if (existingRowTarget) {
        throw new Error('Only one line column can use row-level conditional formatting.');
      }
    }
    nextLineFormatRules[key] = normalizedRuleSet;
    await persistBoardSettings({ nextLineFormatRules });
  }, [defaultLineKeys, effectiveLineColumnFormatRules, persistBoardSettings]);

  const saveLineColumnTextStyle = useCallback(async (columnKey, stylePatch) => {
    const key = String(columnKey || '').trim();
    if (!key) return;
    const merged = mergeColumnTextStyle(effectiveLineColumnTextStyles[key], stylePatch);
    const nextLineTextStyles = { ...effectiveLineColumnTextStyles };
    if (!merged) delete nextLineTextStyles[key];
    else nextLineTextStyles[key] = merged;
    await persistBoardSettings({ nextLineTextStyles });
  }, [effectiveLineColumnTextStyles, persistBoardSettings]);

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
    const column = lineColumns.find((entry) => entry.key === key);
    if (enabled && !isSummableLineColumn(column)) return;
    const nextSet = new Set(effectiveLineTotalColumns);
    if (enabled) nextSet.add(key);
    else nextSet.delete(key);
    await persistBoardSettings({ nextLineTotalColumns: Array.from(nextSet) });
  }, [effectiveLineTotalColumns, lineColumns, persistBoardSettings]);

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
    trackChangesMeta,
    loading,
    refreshing,
    markingViewed,
    error,
    visibleColumnKeys: effectiveVisibleKeys,
    headerColumnWidths: effectiveHeaderColumnWidths,
    lineColumnWidths: effectiveLineColumnWidths,
    headerColumnTextStyles: effectiveHeaderColumnTextStyles,
    headerColumnFormatRules: effectiveHeaderColumnFormatRules,
    lineColumnTextStyles: effectiveLineColumnTextStyles,
    lineColumnFormatRules: effectiveLineColumnFormatRules,
    lineTotalColumns: effectiveLineTotalColumns,
    lineTotalHeaderLinks: effectiveLineTotalHeaderLinks,
    lineValueHeaderLinks: effectiveLineValueHeaderLinks,
    savingColumns,
    refresh,
    finishRefresh,
    setRefreshError,
    reloadAfterRefresh,
    reload,
    markViewed,
    deleteRows,
    saveValue,
    correctField,
    toggleWriteback,
    addColumn,
    addHeaderColumnAfter,
    updateFormulaColumn,
    renameColumn,
    updateStatusOptions,
    removeColumn,
    saveVisibleColumns,
    reorderHeaderColumn,
    reorderLineColumn,
    setLineColumnTotal,
    addLineTotalHeaderLink,
    addLineValueHeaderLink,
    saveHeaderColumnWidth,
    saveLineColumnWidth,
    saveHeaderColumnTextStyle,
    saveHeaderColumnFormatRules,
    saveLineColumnTextStyle,
    saveLineColumnFormatRules,
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
    trackChangesMeta,
    loading,
    refreshing,
    markingViewed,
    error,
    effectiveVisibleKeys,
    effectiveHeaderColumnWidths,
    effectiveLineColumnWidths,
    effectiveHeaderColumnTextStyles,
    effectiveHeaderColumnFormatRules,
    effectiveLineColumnTextStyles,
    effectiveLineColumnFormatRules,
    effectiveLineTotalColumns,
    effectiveLineTotalHeaderLinks,
    effectiveLineValueHeaderLinks,
    savingColumns,
    refresh,
    finishRefresh,
    setRefreshError,
    reloadAfterRefresh,
    reload,
    markViewed,
    deleteRows,
    saveValue,
    correctField,
    toggleWriteback,
    addColumn,
    addHeaderColumnAfter,
    updateFormulaColumn,
    renameColumn,
    updateStatusOptions,
    removeColumn,
    saveVisibleColumns,
    reorderHeaderColumn,
    reorderLineColumn,
    setLineColumnTotal,
    addLineTotalHeaderLink,
    addLineValueHeaderLink,
    saveHeaderColumnWidth,
    saveLineColumnWidth,
    saveHeaderColumnTextStyle,
    saveHeaderColumnFormatRules,
    saveLineColumnTextStyle,
    saveLineColumnFormatRules,
    exportColumnLayout,
    applyColumnLayout,
  ]);
}
