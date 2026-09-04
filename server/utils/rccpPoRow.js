'use strict';

/**
 * Gedeelde PO-rij helpers voor RCCP-aggregatie en PO-segmenten.
 * Geen RccpAnalysisService-import — leaf-util.
 */

const { getIsoWeek, getIsoWeekYear, isoWeekKey, isIsoWeekInWindow } = require('./isoWeek');
const { parseRccpColumnRef } = require('./rccpColumnRef');

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function pickValue(values, key) {
  if (!values || !key) return null;
  const v = values[key];
  return v === undefined || v === null || v === '' ? null : v;
}

function pickConfiguredValue(values, storedKey) {
  const { key } = parseRccpColumnRef(storedKey);
  return pickValue(values, key);
}

function resolveLineMeasureQty(lineValues, masterValues, measureKey, share = 1) {
  const { key, scope } = parseRccpColumnRef(measureKey);
  if (!key) return 0;
  if (scope === 'master') return toNumber(pickValue(masterValues, key)) * share;
  if (scope === 'detail') return toNumber(pickValue(lineValues, key));
  const lineRaw = pickValue(lineValues, key);
  const masterQty = toNumber(pickValue(masterValues, key));
  return lineRaw !== null ? toNumber(lineRaw) : masterQty * share;
}

/** Header-totaal: de key staat op de order, niet op de regels. */
function isHeaderOnlyMeasure(details, masterValues, measureKey) {
  const { key, scope } = parseRccpColumnRef(measureKey);
  if (!key) return false;
  if (scope === 'detail') return false;
  if (pickValue(masterValues, key) === null) return false;
  if (scope === 'master') return true;
  if (!details.length) return true;
  return details.every((detail) => pickValue(detail.values || {}, key) === null);
}

function lineDateValue(lineValues, masterValues, dateColumnKey) {
  const { key, scope } = parseRccpColumnRef(dateColumnKey);
  if (!key) return null;
  if (scope === 'master') return pickValue(masterValues, key);
  if (scope === 'detail') return pickValue(lineValues, key);
  return pickValue(lineValues, key) || pickValue(masterValues, key);
}

function hasLineDate(lineValues, storedKey) {
  const { key, scope } = parseRccpColumnRef(storedKey);
  if (!key || scope === 'master') return false;
  return pickValue(lineValues, key) !== null;
}

function isSentinelDate(value) {
  if (value === null || value === undefined || value === '') return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCFullYear() <= 1900 || date.getFullYear() <= 1900;
}

const PLANNING_DATE_CONFIRMED = 'confirmed';
const PLANNING_DATE_REQUESTED = 'requested';

function parsePlanningDateMode(raw) {
  return String(raw || '').toLowerCase() === PLANNING_DATE_CONFIRMED
    ? PLANNING_DATE_CONFIRMED
    : PLANNING_DATE_REQUESTED;
}

function realIsoDate(value) {
  if (!value || isSentinelDate(value)) return null;
  const year = getIsoWeekYear(value);
  const week = getIsoWeek(value);
  return year && week ? value : null;
}

/**
 * Planningdatum per regel: requested of confirmed, zonder automatische fallback.
 */
function planningDateValue(lineValues, masterValues, requestedKey, confirmedKey, mode) {
  if (parsePlanningDateMode(mode) === PLANNING_DATE_CONFIRMED) {
    return realIsoDate(lineDateValue(lineValues, masterValues, confirmedKey));
  }
  return lineDateValue(lineValues, masterValues, requestedKey) || null;
}

/**
 * Regels (of de header zelf) waarvan de gekozen datum in het RCCP-venster valt.
 * `fallbackKey` wordt alleen gebruikt als de primaire datum ontbreekt.
 */
function collectDateSlots(
  details, masterValues, primaryKey, fallbackKey, window, excludedSet, masterStatus,
) {
  const sources = details.length
    ? details.map((detail) => ({ lineNumber: detail.detailKey, lineValues: detail.values || {} }))
    : [{ lineNumber: null, lineValues: masterValues }];
  const slots = [];
  for (const source of sources) {
    const status = pickValue(source.lineValues, 'status') ?? masterStatus;
    if (status && excludedSet.has(String(status).toLowerCase())) continue;
    const dateValue = lineDateValue(source.lineValues, masterValues, primaryKey)
      || (fallbackKey ? lineDateValue(source.lineValues, masterValues, fallbackKey) : null);
    if (!dateValue) continue;
    const year = getIsoWeekYear(dateValue);
    const week = getIsoWeek(dateValue);
    if (!year || !week || !isIsoWeekInWindow(year, week, window)) continue;
    slots.push({
      ...source,
      dateValue,
      year,
      week,
      key: isoWeekKey(year, week),
      dateFromHeader: !hasLineDate(source.lineValues, primaryKey),
    });
  }
  return slots;
}

function collectPlanningSlots(
  details, masterValues, requestedKey, confirmedKey, window, excludedSet, masterStatus, mode,
) {
  const sources = details.length
    ? details.map((detail) => ({ lineNumber: detail.detailKey, lineValues: detail.values || {} }))
    : [{ lineNumber: null, lineValues: masterValues }];
  const slots = [];
  for (const source of sources) {
    const status = pickValue(source.lineValues, 'status') ?? masterStatus;
    if (status && excludedSet.has(String(status).toLowerCase())) continue;
    const dateValue = planningDateValue(
      source.lineValues, masterValues, requestedKey, confirmedKey, mode,
    );
    if (!dateValue) continue;
    const year = getIsoWeekYear(dateValue);
    const week = getIsoWeek(dateValue);
    if (!year || !week || !isIsoWeekInWindow(year, week, window)) continue;
    slots.push({
      ...source,
      dateValue,
      year,
      week,
      key: isoWeekKey(year, week),
      dateFromHeader: !hasLineDate(source.lineValues, requestedKey)
        && !hasLineDate(source.lineValues, confirmedKey),
    });
  }
  return slots;
}

module.exports = {
  toNumber,
  pickValue,
  pickConfiguredValue,
  resolveLineMeasureQty,
  isHeaderOnlyMeasure,
  lineDateValue,
  isSentinelDate,
  PLANNING_DATE_CONFIRMED,
  PLANNING_DATE_REQUESTED,
  parsePlanningDateMode,
  planningDateValue,
  collectDateSlots,
  collectPlanningSlots,
};
