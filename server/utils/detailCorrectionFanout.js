'use strict';

const MAX_DETAIL_PATCHES = 200;

function planFanout({ lines, columnKey, targetValue, valuesEqual }) {
  const skipped = [];
  const toPatch = [];
  for (const line of lines || []) {
    if (line.removed) continue;
    const current = line.values?.[columnKey];
    if (valuesEqual(current, targetValue)) skipped.push(line.detailKey);
    else toPatch.push(line);
  }
  return { toPatch, skipped, tooMany: toPatch.length > MAX_DETAIL_PATCHES };
}

function remainingValuesAfterPass({
  lines, columnKey, targetValue, updatedDetailKeys,
}) {
  const updated = new Set(updatedDetailKeys);
  const seen = new Set();
  const list = [];
  for (const line of lines || []) {
    if (line.removed) continue;
    const next = updated.has(line.detailKey) ? targetValue : line.values?.[columnKey];
    if (next === null || next === undefined || next === '') continue;
    const key = String(next).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push(next);
  }
  return list;
}

function isBusinessWriteBackError(err) {
  const status = Number(err?.status);
  return status === 400 || status === 404 || status === 409;
}

function isInfraWriteBackError(err) {
  const status = Number(err?.status);
  return !Number.isFinite(status) || status >= 500;
}

module.exports = {
  MAX_DETAIL_PATCHES,
  planFanout,
  remainingValuesAfterPass,
  isBusinessWriteBackError,
  isInfraWriteBackError,
};
