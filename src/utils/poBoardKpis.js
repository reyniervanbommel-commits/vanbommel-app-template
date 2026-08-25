/**
 * KPI's over de zichtbare PO-tabelrijen (header), met RCCP-kolommapping.
 * Geen weekvenster, geen capacity (zit niet in de PO-tabel).
 */

export const PO_BOARD_CLICKABLE_KPI_KEYS = [
  'ordered',
  'delivered',
  'open',
  'lateDelivery',
  'lateItems',
  'openLate',
];

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function utcDayValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function calendarDaysBetween(later, earlier) {
  const a = utcDayValue(later);
  const b = utcDayValue(earlier);
  if (a === null || b === null) return null;
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

function isoWeekPartsUtc(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const year = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearStartDay = yearStart.getUTCDay() || 7;
  yearStart.setUTCDate(yearStart.getUTCDate() + 4 - yearStartDay);
  const week = 1 + Math.round((utc - yearStart) / (7 * 24 * 60 * 60 * 1000));
  return { year, week };
}

function compareIsoWeek(a, b) {
  if (!a || !b) return 0;
  if (a.year !== b.year) return a.year - b.year;
  return a.week - b.week;
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function percentOf(part, whole) {
  if (!(whole > 0)) return 0;
  return (part / whole) * 100;
}

function pickValue(values, key) {
  if (!values || !key) return null;
  const v = values[key];
  return v === undefined || v === null || v === '' ? null : v;
}

function collectSkus(order, itemKey) {
  const skus = new Set();
  const linked = order?.linkedLineValues?.[itemKey];
  if (Array.isArray(linked)) {
    linked.forEach((item) => {
      const sku = String(item || '').trim();
      if (sku) skus.add(sku);
    });
  }
  const header = String(pickValue(order?.values, itemKey) || '').trim();
  if (header) skus.add(header);
  return skus;
}

function addSkus(target, order, itemKey) {
  collectSkus(order, itemKey).forEach((sku) => target.add(sku));
}

/**
 * @param {object[]} orders zichtbare header-rijen (na kolomfilters)
 * @param {object} config RCCP-config (open/delivered/datum-kolommen)
 * @param {{ now?: Date }} [options]
 */
export function buildPoBoardKpis(orders, config, { now = new Date() } = {}) {
  const openKey = String(config?.openMeasureKey || '').trim();
  const deliveredKey = String(config?.deliveredMeasureKey || '').trim();
  const dateKey = config?.dateColumnKey;
  const receiptKey = String(config?.receiptDateColumnKey || '').trim();
  const itemKey = 'itemNumber';
  const excludedSet = new Set((config?.excludedStatuses || []).map((s) => String(s).toLowerCase()));
  const nowParts = isoWeekPartsUtc(now);

  const matchByKey = {
    ordered: new Set(),
    delivered: new Set(),
    open: new Set(),
    lateDelivery: new Set(),
    lateItems: new Set(),
    openLate: new Set(),
  };

  let totalOpen = 0;
  let totalDelivered = 0;
  const lateDeliveryDays = [];
  const lateDeliverySkus = new Set();
  const openLateDays = [];
  const openLateSkus = new Set();

  for (const order of orders || []) {
    const values = order?.values || {};
    const status = pickValue(values, 'status') ?? pickValue(values, 'purchaseOrderStatus');
    if (status && excludedSet.has(String(status).toLowerCase())) continue;

    const openQty = Math.max(0, openKey ? toNumber(pickValue(values, openKey)) : 0);
    const deliveredQty = Math.max(0, deliveredKey ? toNumber(pickValue(values, deliveredKey)) : 0);
    const orderNumber = order?.orderNumber;
    if (!orderNumber) continue;

    if (openQty + deliveredQty > 0) matchByKey.ordered.add(orderNumber);
    if (deliveredQty > 0) matchByKey.delivered.add(orderNumber);
    if (openQty > 0) matchByKey.open.add(orderNumber);
    totalOpen += openQty;
    totalDelivered += deliveredQty;

    const plannedDate = dateKey ? pickValue(values, dateKey) : null;
    const receiptDate = (receiptKey && pickValue(values, receiptKey)) || plannedDate;
    const plannedParts = plannedDate ? isoWeekPartsUtc(plannedDate) : null;

    if (deliveredQty > 0 && receiptDate && plannedDate) {
      const days = calendarDaysBetween(receiptDate, plannedDate);
      if (days > 0) {
        lateDeliveryDays.push(days);
        addSkus(lateDeliverySkus, order, itemKey);
        matchByKey.lateDelivery.add(orderNumber);
        matchByKey.lateItems.add(orderNumber);
      }
    }

    if (openQty > 0 && plannedParts && nowParts && compareIsoWeek(plannedParts, nowParts) < 0) {
      const days = calendarDaysBetween(now, plannedDate);
      if (days !== null && days > 0) {
        openLateDays.push(days);
        addSkus(openLateSkus, order, itemKey);
        matchByKey.openLate.add(orderNumber);
      }
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
