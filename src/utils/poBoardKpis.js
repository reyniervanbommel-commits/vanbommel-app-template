/**
 * Aggregeert compacte server-side per-PO KPI-stats over de zichtbare tabelrijen.
 * Capacity blijft leeg: die zit niet in de PO-tabel.
 */

export const PO_BOARD_CLICKABLE_KPI_KEYS = [
  'ordered',
  'delivered',
  'open',
  'lateDelivery',
  'lateItems',
  'onTime',
  'openLate',
];

function percentOf(part, whole) {
  if (!(whole > 0)) return 0;
  return (part / whole) * 100;
}

function emptyMatchByKey() {
  return {
    ordered: new Set(),
    delivered: new Set(),
    open: new Set(),
    lateDelivery: new Set(),
    lateItems: new Set(),
    onTime: new Set(),
    openLate: new Set(),
  };
}

function addIndexedSkus(target, sku, indexes) {
  (indexes || []).forEach((index) => {
    const next = String(sku[index] || '').trim();
    if (next) target.add(next);
  });
}

/**
 * @param {{ sku?: string[], orders?: Record<string, object> }} payload
 * @param {string[]} visibleOrderNumbers
 */
export function aggregatePoBoardKpisFromByOrder(payload, visibleOrderNumbers) {
  const sku = payload?.sku || [];
  const orders = payload?.orders || {};
  const matchByKey = emptyMatchByKey();
  let totalOpen = 0;
  let totalDelivered = 0;
  let lateSum = 0;
  let lateCount = 0;
  let lateDeliveryUnits = 0;
  let onTimeUnits = 0;
  let openLateSum = 0;
  let openLateCount = 0;
  const lateDeliverySkus = new Set();
  const onTimeSkus = new Set();
  const openSkus = new Set();
  const openLateSkus = new Set();

  for (const orderNumber of visibleOrderNumbers || []) {
    const entry = orders[orderNumber];
    if (!entry) continue;
    const openQty = Number(entry.o) || 0;
    const deliveredQty = Number(entry.d) || 0;
    totalOpen += openQty;
    totalDelivered += deliveredQty;
    if (openQty + deliveredQty > 0) matchByKey.ordered.add(orderNumber);
    if (deliveredQty > 0) matchByKey.delivered.add(orderNumber);
    if (openQty > 0) matchByKey.open.add(orderNumber);
    addIndexedSkus(openSkus, sku, entry.oi);
    if (entry.ln) {
      lateSum += Number(entry.ls) || 0;
      lateCount += Number(entry.ln) || 0;
      lateDeliveryUnits += Number(entry.lu) || 0;
      addIndexedSkus(lateDeliverySkus, sku, entry.lk);
      matchByKey.lateDelivery.add(orderNumber);
      matchByKey.lateItems.add(orderNumber);
    }
    if (entry.tu || (entry.tk && entry.tk.length)) {
      onTimeUnits += Number(entry.tu) || 0;
      addIndexedSkus(onTimeSkus, sku, entry.tk);
      matchByKey.onTime.add(orderNumber);
    }
    if (entry.on) {
      openLateSum += Number(entry.os) || 0;
      openLateCount += Number(entry.on) || 0;
      addIndexedSkus(openLateSkus, sku, entry.ok);
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
      lateDeliveryAvgDays: lateCount ? lateSum / lateCount : null,
      lateDeliveryItemCount: lateDeliverySkus.size,
      lateDeliveryUnits,
      lateDeliveryPercent: percentOf(lateDeliveryUnits, totalOrdered),
      onTimeItemCount: onTimeSkus.size,
      onTimeUnits,
      onTimePercent: percentOf(onTimeUnits, totalOrdered),
      openItemCount: openSkus.size,
      openLateItemCount: openLateSkus.size,
      openLateAvgDays: openLateCount ? openLateSum / openLateCount : null,
      capacityShortfall: null,
      overloadedWeeks: null,
    },
    matchByKey,
  };
}
