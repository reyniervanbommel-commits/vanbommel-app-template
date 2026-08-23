'use strict';

/**
 * Bepaalt welke bestaande bronkolommen Discover mag wissen: wel in tb_columns,
 * niet in de D365-sample, geen sleutel-/beschermd veld, geen custom/lookup.
 * Lege discovery → niets wissen (voorkomt dat een mislukte sample alles weghaalt).
 */
function listStaleSourceColumns(existingColumns, discoveredFields, protectedSourceFields = []) {
  const discovered = new Set(
    (Array.isArray(discoveredFields) ? discoveredFields : [])
      .map((entry) => String(entry?.field || entry || '').trim().toLowerCase())
      .filter(Boolean)
  );
  if (!discovered.size) return [];

  const protectedFields = new Set(
    (Array.isArray(protectedSourceFields) ? protectedSourceFields : [])
      .map((field) => String(field || '').trim().toLowerCase())
      .filter(Boolean)
  );

  return (Array.isArray(existingColumns) ? existingColumns : []).filter((column) => {
    if (String(column?.source || '').trim() !== 'source') return false;
    const sourceField = String(column?.sourceField || '').trim();
    if (!sourceField) return false;
    const normalized = sourceField.toLowerCase();
    if (protectedFields.has(normalized)) return false;
    return !discovered.has(normalized);
  });
}

function isEmptySampleValue(value) {
  return value === null || value === undefined || value === '';
}

function formatSampleValue(value) {
  if (isEmptySampleValue(value)) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function lookupRawFieldValue(raw, field) {
  if (!raw || typeof raw !== 'object') return undefined;
  const name = String(field || '').trim();
  if (!name) return undefined;
  if (Object.prototype.hasOwnProperty.call(raw, name)) return raw[name];
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(raw)) {
    if (String(key).toLowerCase() === lower) return value;
  }
  return undefined;
}

function firstNonEmptySample(rawRows, field) {
  const rows = Array.isArray(rawRows) ? rawRows : [];
  for (let i = 0; i < rows.length; i += 1) {
    const candidate = lookupRawFieldValue(rows[i], field);
    if (isEmptySampleValue(candidate)) continue;
    if (Array.isArray(candidate)) continue;
    if (typeof candidate === 'object') continue;
    return candidate;
  }
  return undefined;
}

function fillMissingSamplesFromRawRows(previewTable, fields, rawRows) {
  if (!previewTable || !Array.isArray(fields) || !fields.length || !Array.isArray(rawRows) || !rawRows.length) {
    return previewTable;
  }
  const nextSampleByField = { ...(previewTable.sampleByField || {}) };
  for (const field of fields) {
    if (nextSampleByField[field] && nextSampleByField[field] !== '—') continue;
    const candidate = firstNonEmptySample(rawRows, field);
    nextSampleByField[field] = candidate === undefined ? '—' : formatSampleValue(candidate);
  }
  return {
    ...previewTable,
    sampleByField: nextSampleByField,
  };
}

function sampleMapFromDiscoveredFields(discoveredFields) {
  const sampleByField = {};
  for (const entry of Array.isArray(discoveredFields) ? discoveredFields : []) {
    const field = String(entry?.field || '').trim();
    if (!field) continue;
    sampleByField[field] = isEmptySampleValue(entry?.sample) ? '—' : formatSampleValue(entry.sample);
  }
  return sampleByField;
}

module.exports = {
  listStaleSourceColumns,
  isEmptySampleValue,
  formatSampleValue,
  lookupRawFieldValue,
  firstNonEmptySample,
  fillMissingSamplesFromRawRows,
  sampleMapFromDiscoveredFields,
};
