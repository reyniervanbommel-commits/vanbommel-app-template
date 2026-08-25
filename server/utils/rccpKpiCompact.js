'use strict';

function internSku(skuList, skuIndex, sku) {
  if (skuIndex.has(sku)) return skuIndex.get(sku);
  const index = skuList.length;
  skuList.push(sku);
  skuIndex.set(sku, index);
  return index;
}

function compactByOrder(byOrder) {
  const sku = [];
  const skuIndex = new Map();
  const orders = {};
  for (const [poNumber, entry] of Object.entries(byOrder)) {
    if (!entry.openQty && !entry.deliveredQty && !entry.lateCount && !entry.openLateCount) continue;
    const row = {};
    if (entry.openQty) row.o = entry.openQty;
    if (entry.deliveredQty) row.d = entry.deliveredQty;
    if (entry.lateCount) {
      row.ls = entry.lateSum;
      row.ln = entry.lateCount;
      const indexes = [...entry.lateSkus].map((value) => internSku(sku, skuIndex, value));
      if (indexes.length) row.lk = indexes;
    }
    if (entry.openLateCount) {
      row.os = entry.openLateSum;
      row.on = entry.openLateCount;
      const indexes = [...entry.openLateSkus].map((value) => internSku(sku, skuIndex, value));
      if (indexes.length) row.ok = indexes;
    }
    orders[poNumber] = row;
  }
  return { sku, orders };
}

module.exports = { compactByOrder };
