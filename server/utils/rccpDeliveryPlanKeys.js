'use strict';

const PLANNED_DATE_DEFAULT = 'requestedDeliveryDate';
const DELIVERED_DATE_DEFAULT = 'productReceiptDate';
const ORDERED_QTY_DEFAULT = 'quantity';
const DELIVERED_QTY_DEFAULT = 'receivedPurchaseQuantity';

function columnIndex(columns) {
  const byKey = new Map();
  for (const col of columns || []) {
    const key = String(col?.key || '').trim();
    if (key) byKey.set(key, col);
  }
  return byKey;
}

function hasOwn(raw, key) {
  return Boolean(raw) && Object.prototype.hasOwnProperty.call(raw, key);
}

function resolveDateKey(rawValue, defaultKey, byKey) {
  const key = String(rawValue ?? '').trim();
  if (!byKey) return key || defaultKey;
  if (key && byKey.has(key)) return key;
  if (defaultKey && byKey.has(defaultKey)) return defaultKey;
  return '';
}

function resolveQtyKey(rawValue, defaultKey, byKey) {
  const key = String(rawValue ?? '').trim();
  const isMeasure = (candidate) => Boolean(byKey.get(candidate)?.rccpMeasure);
  if (!byKey) return key || defaultKey;
  if (key && isMeasure(key)) return key;
  if (defaultKey && isMeasure(defaultKey)) return defaultKey;
  return '';
}

/**
 * Normaliseert de vier delivery-plan kolomkeys.
 * Zonder `columns` (getConfig-pad): defaults, geen DB-lookup.
 * Met enriched kolomlijst (saveConfig): datumkeys moeten bestaan; qty-keys moeten rccpMeasure zijn.
 * Ongeldige keys vallen stil terug naar default of leeg.
 */
function normalizeDeliveryPlanKeys(raw, columns) {
  const byKey = columns ? columnIndex(columns) : null;
  const plannedRaw = hasOwn(raw, 'deliveryPlanPlannedDateKey')
    ? raw.deliveryPlanPlannedDateKey
    : PLANNED_DATE_DEFAULT;
  const deliveredDateRaw = hasOwn(raw, 'deliveryPlanDeliveredDateKey')
    ? raw.deliveryPlanDeliveredDateKey
    : DELIVERED_DATE_DEFAULT;
  const orderedRaw = hasOwn(raw, 'deliveryPlanOrderedQtyKey')
    ? raw.deliveryPlanOrderedQtyKey
    : ORDERED_QTY_DEFAULT;
  const deliveredQtyRaw = hasOwn(raw, 'deliveryPlanDeliveredQtyKey')
    ? raw.deliveryPlanDeliveredQtyKey
    : DELIVERED_QTY_DEFAULT;

  return {
    deliveryPlanPlannedDateKey: resolveDateKey(plannedRaw, PLANNED_DATE_DEFAULT, byKey)
      || PLANNED_DATE_DEFAULT,
    deliveryPlanDeliveredDateKey: resolveDateKey(deliveredDateRaw, '', byKey),
    deliveryPlanOrderedQtyKey: resolveQtyKey(orderedRaw, ORDERED_QTY_DEFAULT, byKey)
      || ORDERED_QTY_DEFAULT,
    deliveryPlanDeliveredQtyKey: resolveQtyKey(deliveredQtyRaw, '', byKey),
  };
}

module.exports = {
  PLANNED_DATE_DEFAULT,
  DELIVERED_DATE_DEFAULT,
  ORDERED_QTY_DEFAULT,
  DELIVERED_QTY_DEFAULT,
  normalizeDeliveryPlanKeys,
};
