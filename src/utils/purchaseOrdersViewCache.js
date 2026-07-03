const PURCHASE_ORDERS_VIEW_CACHE_TTL_MS = 5 * 60 * 1000;

let purchaseOrdersViewCache = null;

export function getCachedPurchaseOrdersView() {
  if (!purchaseOrdersViewCache) {
    return null;
  }
  if (purchaseOrdersViewCache.expiresAt <= Date.now()) {
    purchaseOrdersViewCache = null;
    return null;
  }
  return purchaseOrdersViewCache.payload;
}

export function setCachedPurchaseOrdersView(payload) {
  if (!payload || typeof payload !== 'object') {
    return;
  }
  purchaseOrdersViewCache = {
    payload,
    expiresAt: Date.now() + PURCHASE_ORDERS_VIEW_CACHE_TTL_MS,
  };
}

export function clearCachedPurchaseOrdersView() {
  purchaseOrdersViewCache = null;
}
