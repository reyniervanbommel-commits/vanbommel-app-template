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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
const DATE_FIELD_NAME_RE = /Date(?:Time(?:Offset)?)?$/i;

function isIsoDateString(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!ISO_DATE_RE.test(trimmed)) return false;
  return Number.isFinite(Date.parse(trimmed));
}

function looksLikeDateFieldName(field) {
  return DATE_FIELD_NAME_RE.test(String(field || '').trim());
}

/**
 * D365 OData levert datums als ISO-strings, geen Date-objecten.
 * Veldnamen die op Date/DateTime eindigen zijn een fallback bij lege samples.
 */
function inferSourceDataType(value, field) {
  if (value instanceof Date) return 'date';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (isIsoDateString(value)) return 'date';
  if (looksLikeDateFieldName(field) && (isEmptySampleValue(value) || typeof value === 'string')) {
    return 'date';
  }
  return 'text';
}

function shouldPromoteSourceDataType(currentType, inferredType) {
  const current = String(currentType || '').toLowerCase();
  const inferred = String(inferredType || '').toLowerCase();
  return current === 'text' && Boolean(inferred) && inferred !== 'text';
}

function listSourceColumnsToPromote(existingColumns, discoveredFields) {
  const byField = new Map(
    (Array.isArray(existingColumns) ? existingColumns : [])
      .filter((column) => String(column?.source || '') === 'source' && column?.sourceField)
      .map((column) => [String(column.sourceField).toLowerCase(), column])
  );
  const promoted = [];
  for (const fieldMeta of Array.isArray(discoveredFields) ? discoveredFields : []) {
    const existing = byField.get(String(fieldMeta?.field || '').toLowerCase());
    if (!existing) continue;
    if (!shouldPromoteSourceDataType(existing.dataType, fieldMeta.dataType)) continue;
    promoted.push({ id: existing.id, dataType: fieldMeta.dataType });
  }
  return promoted;
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

function listSelectFieldsMissingFromRecord(selectFields, record) {
  const keys = new Set(
    Object.keys(record && typeof record === 'object' ? record : {})
      .filter((key) => key && !String(key).startsWith('@'))
      .map((key) => String(key).toLowerCase())
  );
  if (!keys.size) return [];
  return (Array.isArray(selectFields) ? selectFields : [])
    .map((field) => String(field || '').trim())
    .filter((field) => field && !keys.has(field.toLowerCase()));
}

function formatSelectDropNotice(fields) {
  const list = [...new Set((Array.isArray(fields) ? fields : [])
    .map((field) => String(field || '').trim())
    .filter(Boolean))];
  if (!list.length) return null;
  return `Removed from $select (not returned by D365): ${list.join(', ')}`;
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
  listSelectFieldsMissingFromRecord,
  formatSelectDropNotice,
  sampleMapFromDiscoveredFields,
  inferSourceDataType,
  shouldPromoteSourceDataType,
  listSourceColumnsToPromote,
};
