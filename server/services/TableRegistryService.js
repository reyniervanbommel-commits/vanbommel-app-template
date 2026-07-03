'use strict';

// Gedeelde lees-helpers voor het Table Builder-metamodel (tb_tables / tb_columns / tb_relations).
// Fase A (#AB:152). Bron-neutraal: tableKey -> definitie + kolommen + master-detail-relatie.
// Schrijfacties op de definitie horen in TableColumnsService (app-native kolommen) of de latere
// TableBuilderService (admin); deze module leest alleen.

const sql = require('mssql');

const SCOPES = ['master', 'detail'];
const DATA_TYPES = ['text', 'number', 'date', 'boolean', 'select'];

function getPool() {
  return sql.connect(process.env.SQL_CONNECTION_STRING);
}

function mapColumnRow(row) {
  let options = null;
  if (row.options_json) {
    try {
      options = JSON.parse(row.options_json);
    } catch {
      options = null;
    }
  }
  return {
    id: Number(row.id),
    tableId: Number(row.table_id),
    scope: row.scope,
    key: row.key,
    label: row.label,
    source: row.source,
    sourceField: row.source_field || null,
    dataType: row.data_type,
    options,
    writable: Boolean(row.writable),
    writeMechanism: row.write_mechanism || null,
    isDefaultVisible: Boolean(row.is_default_visible),
    filterable: Boolean(row.filterable),
    sortable: Boolean(row.sortable),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order),
  };
}

const COLUMN_SELECT = `
  SELECT id, table_id, scope, [key], label, source, source_field, data_type, options_json,
         writable, write_mechanism, is_default_visible, filterable, sortable, is_active, sort_order
  FROM dbo.tb_columns
`;

// Resolve een tabel + bron + relatie op natuurlijke sleutel. Gooit 404 als de tabel onbekend/inactief is.
async function getTableByKey(tableKey) {
  const pool = await getPool();
  const result = await pool.request()
    .input('key', sql.NVarChar(64), tableKey)
    .query(`
      SELECT t.id, t.[key], t.label, t.description, t.source_id, t.source_entity, t.key_fields,
             t.default_filter_json, t.cache_mode, t.stale_minutes, t.max_rows, t.is_active,
             s.[key] AS source_key, s.provider_type, s.config_json,
             r.detail_source_entity, r.relation_kind, r.detail_key_fields, r.join_keys_json
      FROM dbo.tb_tables t
      INNER JOIN dbo.tb_sources s ON s.id = t.source_id
      LEFT JOIN dbo.tb_relations r ON r.table_id = t.id AND r.relation_role = 'detail'
      WHERE t.[key] = @key
    `);
  const row = result.recordset[0];
  if (!row || !row.is_active) {
    throw Object.assign(new Error(`Tabel '${tableKey}' niet gevonden`), { status: 404 });
  }
  return {
    id: Number(row.id),
    key: row.key,
    label: row.label,
    description: row.description || null,
    sourceId: Number(row.source_id),
    sourceEntity: row.source_entity,
    keyFields: row.key_fields ? row.key_fields.split(',').map((f) => f.trim()).filter(Boolean) : [],
    defaultFilter: row.default_filter_json || null,
    cacheMode: row.cache_mode,
    staleMinutes: Number(row.stale_minutes),
    maxRows: Number(row.max_rows),
    source: {
      key: row.source_key,
      providerType: row.provider_type,
      config: row.config_json ? safeJson(row.config_json) : {},
    },
    relation: row.relation_kind
      ? {
          detailSourceEntity: row.detail_source_entity || null,
          kind: row.relation_kind,
          detailKeyFields: row.detail_key_fields || null,
          joinKeys: row.join_keys_json ? safeJson(row.join_keys_json) : null,
        }
      : null,
  };
}

// Lookup-relaties (fk_join) van een tabel naar andere tb_tables — voor read-only verrijking (#AB:161).
// Losstaand van de master-detail-relatie (relation_role='detail') die getTableByKey teruggeeft.
async function getLookups(tableId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .query(`
      SELECT source_scope, source_field, target_table_key, target_key_field, lookup_fields_json
      FROM dbo.tb_relations
      WHERE table_id = @tableId AND relation_role = 'lookup'
    `);
  return result.recordset.map((r) => ({
    sourceScope: r.source_scope || 'master',
    sourceField: r.source_field || null,
    targetTableKey: r.target_table_key || null,
    targetKeyField: r.target_key_field || null,
    fields: r.lookup_fields_json ? safeJson(r.lookup_fields_json) : {},
  })).filter((l) => l.sourceField && l.targetTableKey && Object.keys(l.fields).length > 0);
}

function safeJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Model-overzicht voor de admin Data model-pagina (#AB:161): alle actieve tabellen + lookup-relaties
// (fk_join-edges) voor het ER-diagram en de entiteit-kiezer.
async function getModelOverview() {
  const pool = await getPool();
  // Excel-datasets (#AB:162) zijn lookup-doelen, geen zelfstandige board-entiteiten: ze horen niet als
  // losse node in de entiteit-kiezer/ER-nodes (ze hebben geen key_fields en zouden read() laten falen).
  // Ze blijven wél zichtbaar als doel van een lookup-edge hieronder.
  const tablesRes = await pool.request().query(`
    SELECT t.id, t.[key], t.label, t.description, t.source_entity, t.key_fields, t.sort_order,
           d.relation_kind AS detail_kind, d.detail_source_entity
    FROM dbo.tb_tables t
    INNER JOIN dbo.tb_sources s ON s.id = t.source_id
    LEFT JOIN dbo.tb_relations d ON d.table_id = t.id AND d.relation_role = 'detail'
    WHERE t.is_active = 1 AND s.[key] <> 'excel'
    ORDER BY t.sort_order, t.label
  `);
  const edgesRes = await pool.request().query(`
    SELECT tt.[key] AS from_key, r.target_table_key AS to_key, r.source_scope, r.source_field
    FROM dbo.tb_relations r
    INNER JOIN dbo.tb_tables tt ON tt.id = r.table_id
    WHERE r.relation_role = 'lookup'
  `);
  const tables = tablesRes.recordset.map((r) => ({
    key: r.key,
    label: r.label,
    description: r.description || null,
    sourceEntity: r.source_entity,
    keyFields: r.key_fields ? r.key_fields.split(',').map((f) => f.trim()).filter(Boolean) : [],
    hasDetail: Boolean(r.detail_kind && r.detail_kind !== 'none'),
    detailEntity: r.detail_source_entity || null,
  }));
  const edges = edgesRes.recordset.map((r) => ({
    from: r.from_key,
    to: r.to_key,
    cardinality: 'n:1',
    sourceScope: r.source_scope || 'master',
    on: r.source_field || null,
  }));
  return { tables, edges };
}

async function listColumns({ tableId, scope = null, includeInactive = false }) {
  const pool = await getPool();
  const request = pool.request().input('tableId', sql.BigInt, tableId);
  const conditions = ['table_id = @tableId'];
  if (scope) {
    request.input('scope', sql.NVarChar(16), scope);
    conditions.push('scope = @scope');
  }
  if (!includeInactive) conditions.push('is_active = 1');
  const result = await request.query(`
    ${COLUMN_SELECT}
    WHERE ${conditions.join(' AND ')}
    ORDER BY scope, sort_order, label
  `);
  return result.recordset.map(mapColumnRow);
}

async function getColumnById(columnId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, columnId)
    .query(`${COLUMN_SELECT} WHERE id = @id`);
  return result.recordset.length ? mapColumnRow(result.recordset[0]) : null;
}

module.exports = {
  SCOPES,
  DATA_TYPES,
  getPool,
  getTableByKey,
  listColumns,
  getColumnById,
  getLookups,
  getModelOverview,
  mapColumnRow,
};
