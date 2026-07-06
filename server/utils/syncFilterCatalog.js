'use strict';

function normalizeLevel(rawLevel) {
  const level = String(rawLevel || '').trim().toLowerCase();
  if (level === 'header' || level === 'line') return level;
  return null;
}

function toFieldKey(level, field) {
  const safeLevel = normalizeLevel(level);
  const safeField = String(field || '').trim();
  if (!safeLevel || !safeField) return null;
  return `${safeLevel}|${safeField}`;
}

function buildAllowedSyncFilterFields(filterMeta, columns) {
  const allowedFields = new Set();

  const headerFields = Array.isArray(filterMeta?.catalog?.header) ? filterMeta.catalog.header : [];
  const lineFields = Array.isArray(filterMeta?.catalog?.line) ? filterMeta.catalog.line : [];
  for (const entry of headerFields) {
    const key = toFieldKey('header', entry?.field);
    if (key) allowedFields.add(key);
  }
  for (const entry of lineFields) {
    const key = toFieldKey('line', entry?.field);
    if (key) allowedFields.add(key);
  }

  const registryColumns = Array.isArray(columns) ? columns : [];
  for (const column of registryColumns) {
    if (column?.source !== 'd365') continue;
    const key = toFieldKey(column.level, column.d365Field);
    if (key) allowedFields.add(key);
  }

  return allowedFields;
}

module.exports = {
  normalizeLevel,
  buildAllowedSyncFilterFields,
};
