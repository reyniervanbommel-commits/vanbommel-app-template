'use strict';

// Sync-filtercatalogus voor de generieke tb_*-laag (#AB:175, cutover Fase 6). Bouwt de lijst filterbare
// D365-velden (per level header/line) uit de admin-gemapte kolommen. Overgenomen uit de po_-cacheservice
// (buildCatalogFromColumns/createFilterCatalogPayload) zodat po_* verwijderd kan worden. Preview is leeg
// (v1): de sync-filter-UI heeft alleen de veldenlijst + valueType nodig.

const { isEnumField } = require('./d365EnumFields');

function toCatalogValueType(column) {
  // Enum-velden komen uit de centrale registry (d365EnumFields.js), niet uit een hardcoded lijst.
  if (isEnumField(column.d365Field)) return 'enum';
  if (column.dataType === 'number') return 'number';
  if (column.dataType === 'date') return 'date';
  return 'text';
}

function buildCatalogFromColumns(adminColumns, level) {
  return adminColumns
    .filter((c) => c.level === level && c.source === 'd365' && c.d365Field)
    .map((c) => ({
      level,
      field: c.d365Field,
      label: c.label || c.d365Field,
      valueType: toCatalogValueType(c),
      nonEmptyCount: 0,
      fillRatio: 0,
      sampleValues: [],
    }))
    .sort((a, b) => a.field.localeCompare(b.field));
}

function buildSampleByField(catalogRows) {
  const sampleByField = {};
  for (const entry of catalogRows) sampleByField[entry.field] = entry.sampleValues[0] || '—';
  return sampleByField;
}

// adminColumns = kolommen in de admin-vorm (level, source 'd365'|'custom', d365Field, dataType).
function buildFilterCatalogPayload(adminColumns) {
  const cols = Array.isArray(adminColumns) ? adminColumns : [];
  const headerCatalog = buildCatalogFromColumns(cols, 'header');
  const lineCatalog = buildCatalogFromColumns(cols, 'line');
  return {
    catalog: { header: headerCatalog, line: lineCatalog },
    preview: {
      header: { columns: [], rows: [], sampledRows: 0, sampleByField: buildSampleByField(headerCatalog) },
      line: { columns: [], rows: [], sampledRows: 0, sampleByField: buildSampleByField(lineCatalog) },
    },
  };
}

module.exports = { buildFilterCatalogPayload };
