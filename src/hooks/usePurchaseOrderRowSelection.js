import { useCallback, useMemo, useState } from 'react';

// Stabiele selectiesleutel per order: de natuurlijke sleutel (dataAreaId + orderNumber)
// die ook de backend gebruikt om een rij als exclusion te verwijderen.
export function rowSelectionKey(dataAreaId, orderNumber, fallbackKey = '') {
  const resolvedDataAreaId = dataAreaId ?? '';
  const resolvedOrderNumber = orderNumber ?? fallbackKey;
  return `${resolvedDataAreaId}|${resolvedOrderNumber}`;
}

export function resolveOrderSelectionKey(order, fallbackKey = '') {
  const orderNumber = order?.orderNumber ?? order?.values?.orderNumber ?? fallbackKey;
  return rowSelectionKey(order?.dataAreaId ?? '', orderNumber, fallbackKey);
}

// Beheert de multi-select-state van PO-rijen. Selectie is los van de tabel-/board-view
// (grouping/filtering) zodat een selectie een refresh of hersortering overleeft; sleutels
// die niet meer bestaan worden bij gebruik (delete) simpelweg genegeerd door de aanroeper.
export function usePurchaseOrderRowSelection() {
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const isSelected = useCallback((key) => selectedKeys.has(key), [selectedKeys]);

  const toggle = useCallback((key) => {
    if (!key) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Zet een reeks sleutels in één keer aan of uit (t.b.v. "selecteer alles").
  const setMany = useCallback((keys, selected) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      (Array.isArray(keys) ? keys : []).forEach((key) => {
        if (!key) return;
        if (selected) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedKeys(new Set()), []);

  return useMemo(() => ({
    selectedKeys,
    selectedCount: selectedKeys.size,
    isSelected,
    toggle,
    setMany,
    clear,
  }), [selectedKeys, isSelected, toggle, setMany, clear]);
}
