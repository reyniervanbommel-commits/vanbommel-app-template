import { rowSelectionKey } from '../hooks/usePurchaseOrderRowSelection';

export function orderLocateKeyFromPanelRow(row) {
  const partitionKey = row?.partitionKey ?? row?.dataAreaId ?? '';
  const recordKey = row?.recordKey ?? row?.orderNumber ?? '';
  return rowSelectionKey(partitionKey, recordKey);
}

export function orderLocateKeyFromOrder(order) {
  return rowSelectionKey(order?.dataAreaId ?? '', order?.orderNumber ?? '');
}

/**
 * Finds the leaf group that renders a purchase order row.
 */
export function findOrderGroupContext(groupedRows, locateKey) {
  if (!locateKey || !Array.isArray(groupedRows)) return null;

  for (const group of groupedRows) {
    const entries = Array.isArray(group.entries) ? group.entries : [];
    if (!entries.length) continue;

    const hasMatch = entries.some(
      (entry) => orderLocateKeyFromOrder(entry.order) === locateKey
    );
    if (!hasMatch) continue;

    const keysToExpand = [...(group.ancestorGroupKeys || [])];
    if (group.groupKey && group.groupKey !== 'all-rows') {
      keysToExpand.push(group.groupKey);
    }
    return { keysToExpand };
  }

  return null;
}

export const ROW_LOCATE_HIGHLIGHT_MS = 2500;
