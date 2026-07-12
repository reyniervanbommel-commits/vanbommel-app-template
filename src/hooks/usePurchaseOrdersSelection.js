import { useCallback, useMemo } from 'react';
import { resolveOrderSelectionKey, usePurchaseOrderRowSelection } from './usePurchaseOrderRowSelection';

/**
 * Beheert tabelselectie en bulk-delete voor purchase orders.
 */
export function usePurchaseOrdersSelection({ orders, visibleOrders = orders, deleteRows }) {
  const selection = usePurchaseOrderRowSelection();

  const visibleOrderKeys = useMemo(
    () => visibleOrders.map((order) => resolveOrderSelectionKey(order)),
    [visibleOrders]
  );
  const allSelected = visibleOrderKeys.length > 0 && visibleOrderKeys.every((key) => selection.isSelected(key));
  const someSelected = !allSelected && visibleOrderKeys.some((key) => selection.isSelected(key));

  const handleToggleAll = useCallback(() => {
    selection.setMany(visibleOrderKeys, !allSelected);
  }, [selection, visibleOrderKeys, allSelected]);

  const handleDeleteSelected = useCallback(async () => {
    const rows = orders
      .filter((order) => selection.isSelected(resolveOrderSelectionKey(order)))
      .map((order) => ({ dataAreaId: order.dataAreaId, orderNumber: order.orderNumber }));
    if (!rows.length) return;
    await deleteRows(rows);
    selection.clear();
  }, [orders, selection, deleteRows]);

  const tableSelection = useMemo(() => ({
    enabled: true,
    isSelected: selection.isSelected,
    toggle: selection.toggle,
    setMany: selection.setMany,
    allSelected,
    someSelected,
    onToggleAll: handleToggleAll,
  }), [selection.isSelected, selection.toggle, selection.setMany, allSelected, someSelected, handleToggleAll]);

  return useMemo(() => ({
    selection,
    tableSelection,
    handleDeleteSelected,
  }), [selection, tableSelection, handleDeleteSelected]);
}
