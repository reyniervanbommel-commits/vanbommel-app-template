/**
 * Aggregeert server-side per-PO KPI-stats over de zichtbare tabelrijen.
 * Capacity blijft leeg: die zit niet in de PO-tabel.
 */

export const PO_BOARD_CLICKABLE_KPI_KEYS = [
  'ordered',
  'delivered',
  'open',
  'lateDelivery',
  'lateItems',
  'openLate',
];

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function percentOf(part, whole) {
  if (!(whole > 0)) return 0;
  return (part / whole) * 100;
}

function addSkus(target, values) {
  (values || []).forEach((sku) => {
    const next = String(sku || '').trim();
    if (next) target.add(next);
  });
}

function emptyMatchByKey() {
  return {
    ordered: new Set(),
    delivered: new Set(),
    open: new Set(),
    lateDelivery: new Set(),
    lateItems: new Set(),
    openLate: new Set(),
  };
}

/**
 * @param {Record<string, { openQty?: number, deliveredQty?: number, lateDays?: number[], lateSkus?: string[], openLateDays?: number[], openLateSkus?: string[] }>} byOrder
 * @param {string[]} visibleOrderNumbers
 */
export function aggregatePoBoardKpisFromByOrder(byOrder, visibleOrderNumbers) {
  const matchByKey = emptyMatchByKey();
  let totalOpen = 0;
  let totalDelivered = 0;
  const lateDeliveryDays = [];
  const lateDeliverySkus = new Set();
  const openLateDays = [];
  const openLateSkus = new Set();

  for (const orderNumber of visibleOrderNumbers || []) {
    const entry = byOrder?.[orderNumber];
    if (!entry) continue;
    const openQty = Number(entry.openQty) || 0;
    const deliveredQty = Number(entry.deliveredQty) || 0;
    totalOpen += openQty;
    totalDelivered += deliveredQty;
    if (openQty + deliveredQty > 0) matchByKey.ordered.add(orderNumber);
    if (deliveredQty > 0) matchByKey.delivered.add(orderNumber);
    if (openQty > 0) matchByKey.open.add(orderNumber);
    if (Array.isArray(entry.lateDays) && entry.lateDays.length) {
      lateDeliveryDays.push(...entry.lateDays);
      addSkus(lateDeliverySkus, entry.lateSkus);
      matchByKey.lateDelivery.add(orderNumber);
      matchByKey.lateItems.add(orderNumber);
    }
    if (Array.isArray(entry.openLateDays) && entry.openLateDays.length) {
      openLateDays.push(...entry.openLateDays);
      addSkus(openLateSkus, entry.openLateSkus);
      matchByKey.openLate.add(orderNumber);
    }
  }

  const totalOrdered = totalOpen + totalDelivered;
  return {
    kpis: {
      totalOrdered,
      totalDelivered,
      totalOpen,
      deliveredPercent: percentOf(totalDelivered, totalOrdered),
      openPercent: percentOf(totalOpen, totalOrdered),
      lateDeliveryAvgDays: mean(lateDeliveryDays),
      lateDeliveryItemCount: lateDeliverySkus.size,
      openLateItemCount: openLateSkus.size,
      openLateAvgDays: mean(openLateDays),
      capacityShortfall: null,
      overloadedWeeks: null,
    },
    matchByKey,
  };
}
