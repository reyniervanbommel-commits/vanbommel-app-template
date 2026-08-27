import { rowKey } from '../components/supplier/remarks/remarksFormatters';

/**
 * Intersects board rows with remarks search keys, then with the KPI overlay.
 * @param {{ processedItems: object[], remarksFilterEnabled: boolean, remarksMatchKeys: Set<string>|null, kpiMatchKeys: Set<string>|null, kpiFilterKey?: string|null, kpiQtyOverlay?: unknown }} params
 * @returns {{ columnFiltered: object[], displayedItems: object[] }}
 */
export function applyBoardMatchKeys({
  processedItems,
  remarksFilterEnabled,
  remarksMatchKeys,
  kpiMatchKeys,
  kpiFilterKey,
  kpiQtyOverlay,
}) {
  void kpiFilterKey;
  void kpiQtyOverlay;
  const items = Array.isArray(processedItems) ? processedItems : [];
  let columnFiltered = items;
  if (remarksFilterEnabled) {
    columnFiltered = remarksMatchKeys == null
      ? []
      : items.filter((order) => remarksMatchKeys.has(rowKey(order.dataAreaId, order.orderNumber)));
  }

  const displayedItems = !kpiMatchKeys
    ? columnFiltered
    : columnFiltered.filter((order) => kpiMatchKeys.has(order.orderNumber));

  return { columnFiltered, displayedItems };
}
