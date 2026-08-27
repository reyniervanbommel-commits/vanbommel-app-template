'use strict';

/**
 * Week-bucket emit helpers for RCCP PO segments.
 */

const { pickValue } = require('./rccpPoRow');

function emptyWeekBucket() {
  return new Map();
}

function lineItemNumber(lineValues, masterValues) {
  return String(pickValue(lineValues, 'itemNumber') ?? pickValue(masterValues, 'itemNumber') ?? '').trim();
}

function bump(weekMap, week, itemNumber, status, qty, late = false, dataAreaId = '') {
  if (!(qty > 0) || !week) return;
  let itemMap = weekMap.get(week);
  if (!itemMap) {
    itemMap = emptyWeekBucket();
    weekMap.set(week, itemMap);
  }
  const current = itemMap.get(itemNumber) || {
    open: 0, received: 0, late: false, dataAreaId: '',
  };
  if (!current.dataAreaId && dataAreaId) current.dataAreaId = dataAreaId;
  if (status === 'open') {
    current.open += qty;
    current.late = current.late || Boolean(late);
  } else {
    current.received += qty;
  }
  itemMap.set(itemNumber, current);
}

function emitSegment(itemNumber, qty, status, late, dataAreaId) {
  return {
    itemNumber, qty, status, late, dataAreaId: dataAreaId || '',
  };
}

function emitAbove(itemMap) {
  const items = [...itemMap.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const out = [];
  for (const itemNumber of items) {
    const entry = itemMap.get(itemNumber);
    if (entry.received > 0) {
      out.push(emitSegment(itemNumber, entry.received, 'received', false, entry.dataAreaId));
    }
    if (entry.open > 0) {
      out.push(emitSegment(itemNumber, entry.open, 'open', Boolean(entry.late), entry.dataAreaId));
    }
  }
  return out;
}

function emitBelow(itemMap) {
  const items = [...itemMap.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const out = [];
  for (const itemNumber of items) {
    const entry = itemMap.get(itemNumber);
    if (entry.received > 0) {
      out.push(emitSegment(itemNumber, entry.received, 'received', false, entry.dataAreaId));
    }
  }
  return out;
}

function emitConfirmed(itemMap) {
  const items = [...itemMap.keys()].sort((a, b) => String(a).localeCompare(String(b)));
  const out = [];
  for (const itemNumber of items) {
    const entry = itemMap.get(itemNumber);
    if (entry.open > 0) {
      out.push(emitSegment(itemNumber, entry.open, 'confirmed', false, entry.dataAreaId));
    }
  }
  return out;
}

function spreadHeaderQty(weekMap, slots, masterValues, status, total, lateForSlot, dataAreaId) {
  if (!(total > 0) || !slots.length) return;
  const shareQty = total / slots.length;
  for (const slot of slots) {
    const late = typeof lateForSlot === 'function' ? lateForSlot(slot) : false;
    bump(
      weekMap,
      slot.key,
      lineItemNumber(slot.lineValues, masterValues),
      status,
      shareQty,
      late,
      dataAreaId,
    );
  }
}

module.exports = {
  emptyWeekBucket,
  bump,
  emitAbove,
  emitBelow,
  emitConfirmed,
  spreadHeaderQty,
};
