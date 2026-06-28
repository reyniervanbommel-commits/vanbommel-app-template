import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';

const BOARD_KEY = 'purchase-orders';
// D365 OData is traag bij grote datasets; één begrensde pagina mét regels blijft binnen de timeout.
// 'all=true' loopt door tot 10.000 orders en knalt door de timeout (504). Zie 76-visie-d365-composite-proxy.md §4.
const PAGE_SIZE = 50;

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
 * Haalt purchase orders op en beheert kolomvoorkeuren per gebruiker.
 */
export function usePurchaseOrdersPage(defaultColumnKeys) {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [meta, setMeta] = useState({ total: 0, top: PAGE_SIZE, skip: 0, requestedAll: false, fetchedAll: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(defaultColumnKeys);
  const [columnOrder, setColumnOrder] = useState(defaultColumnKeys);
  const [savingColumns, setSavingColumns] = useState(false);

  const loadPurchaseOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/supplier/purchase-orders?top=' + PAGE_SIZE);
      setPurchaseOrders(data.purchaseOrders || []);
      setMeta(data.meta || { total: 0, top: PAGE_SIZE, skip: 0, requestedAll: false, fetchedAll: false });
    } catch (err) {
      setError(err.message);
      setPurchaseOrders([]);
      setMeta({ total: 0, top: PAGE_SIZE, skip: 0, requestedAll: false, fetchedAll: false });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBoardSettings = useCallback(async () => {
    try {
      const data = await apiRequest('/supplier/board-settings/' + BOARD_KEY);
      const settings = data?.settings || null;
      const normalized = normalizeVisibleColumns(settings?.visibleColumns, defaultColumnKeys);
      const normalizedOrder = normalizeColumnOrder(settings?.columnOrder, defaultColumnKeys);
      setVisibleColumnKeys(normalized);
      setColumnOrder(normalizedOrder);
    } catch {
      setVisibleColumnKeys(defaultColumnKeys);
      setColumnOrder(defaultColumnKeys);
    }
  }, [defaultColumnKeys]);

  const saveVisibleColumns = useCallback(async (nextVisibleKeys) => {
    const normalized = normalizeVisibleColumns(nextVisibleKeys, defaultColumnKeys);
    const normalizedOrder = normalizeColumnOrder(columnOrder, defaultColumnKeys);
    setVisibleColumnKeys(normalized);
    setSavingColumns(true);
    try {
      await apiRequest('/supplier/board-settings/' + BOARD_KEY, {
        method: 'PATCH',
        body: { settings: { visibleColumns: normalized, columnOrder: normalizedOrder } },
      });
    } finally {
      setSavingColumns(false);
    }
  }, [columnOrder, defaultColumnKeys]);

  useEffect(() => {
    loadPurchaseOrders();
    loadBoardSettings();
  }, [loadPurchaseOrders, loadBoardSettings]);

  const refresh = useCallback(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  return useMemo(() => ({
    purchaseOrders,
    meta,
    loading,
    error,
    visibleColumnKeys,
    columnOrder,
    savingColumns,
    saveVisibleColumns,
    refresh,
  }), [
    purchaseOrders,
    meta,
    loading,
    error,
    visibleColumnKeys,
    columnOrder,
    savingColumns,
    saveVisibleColumns,
    refresh,
  ]);
}

