import { useCallback, useMemo } from 'react';
import { usePurchaseOrderRowSelection, rowSelectionKey } from './usePurchaseOrderRowSelection';

/**
 * Beheert tabelselectie en bulk-delete voor purchase orders.
 */
export function usePurchaseOrdersSelection({ orders, deleteRows }) {
  const selection = usePurchaseOrderRowSelection();

  const allOrderKeys = useMemo(
    () => orders.map((order) => rowSelectionKey(order.dataAreaId, order.orderNumber)),
    [orders]
  );
  const allSelected = allOrderKeys.length > 0 && allOrderKeys.every((key) => selection.isSelected(key));
  const someSelected = !allSelected && allOrderKeys.some((key) => selection.isSelected(key));

  const handleToggleAll = useCallback(() => {
    selection.setMany(allOrderKeys, !allSelected);
  }, [selection, allOrderKeys, allSelected]);

  const handleDeleteSelected = useCallback(async () => {
    const rows = orders
      .filter((order) => selection.isSelected(rowSelectionKey(order.dataAreaId, order.orderNumber)))
      .map((order) => ({ dataAreaId: order.dataAreaId, orderNumber: order.orderNumber }));
    if (!rows.length) return;
    await deleteRows(rows);
    selection.clear();
  }, [orders, selection, deleteRows]);

  const tableSelection = useMemo(() => ({
    enabled: true,
    isSelected: selection.isSelected,
    toggle: selection.toggle,
    allSelected,
    someSelected,
    onToggleAll: handleToggleAll,
  }), [selection.isSelected, selection.toggle, allSelected, someSelected, handleToggleAll]);

  return useMemo(() => ({
    selection,
    tableSelection,
    handleDeleteSelected,
  }), [selection, tableSelection, handleDeleteSelected]);
}
