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
  'planned1900',
  'validDates',
  'deliveryReliability',
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
    planned1900: new Set(),
    validDates: new Set(),
    deliveryReliability: new Set(),
  };
}

function addIndexedSkus(target, sku, indexes) {
  (indexes || []).forEach((index) => {
    const next = String(sku[index] || '').trim();
    if (next) target.add(next);
  });
}

function kpiQtyFamily(kpiKey) {
  if (
    kpiKey === 'onTime'
    || kpiKey === 'deliveryReliability'
    || kpiKey === 'lateDelivery'
    || kpiKey === 'lateItems'
    || kpiKey === 'delivered'
  ) {
    return 'delivered';
  }
  if (kpiKey === 'open' || kpiKey === 'openLate') return 'open';
  if (kpiKey === 'ordered' || kpiKey === 'planned1900' || kpiKey === 'validDates') return 'ordered';
  return null;
}

export function isKpiQtyOverlayColumn(columnKey, kpiKey) {
  const family = kpiQtyFamily(kpiKey);
  if (!family) return false;
  const key = String(columnKey || '').toLowerCase();
  if (family === 'delivered') {
    if (key.includes('remain') || key.includes('open') || key.includes('order')) return false;
    return key.includes('receiv') || key.includes('deliver');
  }
  if (family === 'open') {
    return key.includes('remain') || (key.includes('open') && !key.includes('order'));
  }
  return key.includes('order') && !key.includes('receiv') && !key.includes('remain');
}

export function kpiQtyForKey(entry, kpiKey) {
  if (!entry) return null;
  if (kpiKey === 'onTime' || kpiKey === 'deliveryReliability') return Number(entry.tu) || 0;
  if (kpiKey === 'lateDelivery' || kpiKey === 'lateItems') return Number(entry.lu) || 0;
  if (kpiKey === 'open') return Number(entry.o) || 0;
  if (kpiKey === 'openLate') return Number(entry.ou) || 0;
  if (kpiKey === 'delivered') return Number(entry.d) || 0;
  if (kpiKey === 'ordered') return (Number(entry.o) || 0) + (Number(entry.d) || 0);
  if (kpiKey === 'planned1900' || kpiKey === 'validDates') return Number(entry.yu) || 0;
  return null;
}

export function buildKpiQtyOverlay(payload, visibleOrderNumbers, kpiKey) {
  if (!kpiKey || !kpiQtyFamily(kpiKey)) return null;
  const orders = payload?.orders || {};
  const overlay = {};
  for (const orderNumber of visibleOrderNumbers || []) {
    const qty = kpiQtyForKey(orders[orderNumber], kpiKey);
    if (qty == null) continue;
    overlay[orderNumber] = qty;
  }
  return overlay;
}

export function overlayKpiQtyOnOrders(orders, overlayByOrder, kpiKey) {
  if (!overlayByOrder || !kpiKey) return orders;
  return (orders || []).map((order) => {
    const qty = overlayByOrder[order?.orderNumber];
    if (qty == null) return order;
    const values = order.values || {};
    let changed = false;
    const nextValues = { ...values };
    Object.keys(values).forEach((key) => {
      if (!isKpiQtyOverlayColumn(key, kpiKey)) return;
      nextValues[key] = qty;
      changed = true;
    });
    return changed ? { ...order, values: nextValues } : order;
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
  let openLateUnits = 0;
  let planned1900Units = 0;
  const lateDeliverySkus = new Set();
  const onTimeSkus = new Set();
  const openSkus = new Set();
  const openLateSkus = new Set();
  const planned1900Skus = new Set();

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
      matchByKey.deliveryReliability.add(orderNumber);
    }
    if (entry.on) {
      openLateSum += Number(entry.os) || 0;
      openLateCount += Number(entry.on) || 0;
      openLateUnits += Number(entry.ou) || 0;
      addIndexedSkus(openLateSkus, sku, entry.ok);
      matchByKey.openLate.add(orderNumber);
    }
    if (entry.yu || (entry.yk && entry.yk.length)) {
      planned1900Units += Number(entry.yu) || 0;
      addIndexedSkus(planned1900Skus, sku, entry.yk);
      matchByKey.planned1900.add(orderNumber);
      matchByKey.validDates.add(orderNumber);
    }
  }

  const totalOrdered = totalOpen + totalDelivered;
  const validPlannedUnits = Math.max(0, totalOrdered - planned1900Units);
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
      openLateUnits,
      openLateAvgDays: openLateCount ? openLateSum / openLateCount : null,
      planned1900Units,
      planned1900ItemCount: planned1900Skus.size,
      validPlannedUnits,
      validPlannedPercent: percentOf(validPlannedUnits, totalOrdered),
      deliveryReliabilityPercent: percentOf(onTimeUnits, totalDelivered),
      capacityShortfall: null,
      overloadedWeeks: null,
    },
    matchByKey,
  };
}
