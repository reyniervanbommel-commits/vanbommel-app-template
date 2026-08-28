'use strict';

/**
 * RCCP cell status: color + label from available/confirmed and thresholds (#AB:224).
 */

function computeRccpStatus(available, confirmed, thresholds = {}) {
  const avail = Number(available) || 0;
  const conf = Number(confirmed) || 0;
  const greenMax = Number(thresholds.greenMax ?? 80);
  const orangeMax = Number(thresholds.orangeMax ?? 100);

  if (avail <= 0 && conf <= 0) {
    return { color: 'grey', label: 'N/A', utilPercent: null };
  }
  if (avail <= 0 && conf > 0) {
    return { color: 'red', label: 'Unplanned', utilPercent: null };
  }

  const utilPercent = Math.round((conf / avail) * 1000) / 10;
  if (utilPercent <= greenMax) {
    return { color: 'green', label: 'OK', utilPercent };
  }
  if (utilPercent <= orangeMax) {
    return { color: 'orange', label: 'Warning', utilPercent };
  }
  return { color: 'red', label: 'Overloaded', utilPercent };
}

function overcapacityStatus(over) {
  const qty = Number(over) || 0;
  if (qty < 0) return { color: 'red', label: 'Shortage' };
  if (qty >= 1) return { color: 'green', label: 'OK' };
  return { color: 'grey', label: 'Even' };
}

module.exports = { computeRccpStatus, overcapacityStatus };
