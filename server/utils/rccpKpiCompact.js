'use strict';

function internSku(skuList, skuIndex, sku) {
  if (skuIndex.has(sku)) return skuIndex.get(sku);
  const index = skuList.length;
  skuList.push(sku);
  skuIndex.set(sku, index);
  return index;
}

function internSet(skuList, skuIndex, values) {
  return [...values].map((value) => internSku(skuList, skuIndex, value));
}

function compactByOrder(byOrder) {
  const sku = [];
  const skuIndex = new Map();
  const orders = {};
  for (const [poNumber, entry] of Object.entries(byOrder)) {
    if (
      !entry.openQty && !entry.deliveredQty && !entry.lateCount
      && !entry.openLateCount && !entry.onTimeUnits && !entry.openSkus.size
      && !entry.planned1900Units
    ) continue;
    const row = {};
    if (entry.openQty) row.o = entry.openQty;
    if (entry.deliveredQty) row.d = entry.deliveredQty;
    if (entry.openSkus.size) row.oi = internSet(sku, skuIndex, entry.openSkus);
    if (entry.lateCount) {
      row.ls = entry.lateSum;
      row.ln = entry.lateCount;
      if (entry.lateUnits) row.lu = entry.lateUnits;
      const indexes = internSet(sku, skuIndex, entry.lateSkus);
      if (indexes.length) row.lk = indexes;
    }
    if (entry.onTimeUnits) {
      row.tu = entry.onTimeUnits;
      const indexes = internSet(sku, skuIndex, entry.onTimeSkus);
      if (indexes.length) row.tk = indexes;
    }
    if (entry.openLateCount) {
      row.os = entry.openLateSum;
      row.on = entry.openLateCount;
      if (entry.openLateUnits) row.ou = entry.openLateUnits;
      const indexes = internSet(sku, skuIndex, entry.openLateSkus);
      if (indexes.length) row.ok = indexes;
    }
    if (entry.planned1900Units) {
      row.yu = entry.planned1900Units;
      const indexes = internSet(sku, skuIndex, entry.planned1900Skus);
      if (indexes.length) row.yk = indexes;
    }
    orders[poNumber] = row;
  }
  return { sku, orders };
}

module.exports = { compactByOrder };
