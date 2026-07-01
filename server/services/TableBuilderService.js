'use strict';

// TableBuilderService — admin-definitie-service voor de Table Builder (#139, Fase B).
// Beheert tabellen (tb_tables), bronnen (tb_sources), master-detail (tb_relations) en het cureren van
// bronkolommen (tb_columns, source='source') via de SourceProvider-velddiscovery. Alle schrijfacties
// valideren server-side en vullen de audit-kolommen (created_by/updated_by) met de user-id.
//
// App-native (source='custom') kolommen worden NIET hier beheerd maar in TableColumnsService.
// Deze service raakt uitsluitend de definitie-laag; data-serve blijft in TableDataService.

const sql = require('mssql');
const { logger } = require('../utils/logger');
const {
  getPool, getTableByKey, listColumns, mapColumnRow, SCOPES, DATA_TYPES,
} = require('./TableRegistryService');
const { getProvider, getProviderForTable } = require('./sources/providerFactory');

const CACHE_MODES = ['auto', 'always', 'never'];
const RELATION_KINDS = ['expand', 'fk_join', 'none'];
const MAX_LABEL = 128;
const MAX_KEY = 64;
const MAX_ENTITY = 256;

// ---------------------------------------------------------------------------
// Helpers / validatie
// ---------------------------------------------------------------------------
function slugify(value) {
  const base = String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_KEY);
  return base || 'tabel';
}

function requireText(value, veld, { max = MAX_LABEL, required = true } = {}) {
  const clean = String(value === undefined || value === null ? '' : value).trim();
  if (!clean) {
    if (required) throw Object.assign(new Error(`${veld} is verplicht`), { status: 400 });
    return null;
  }
  return clean.slice(0, max);
}

function mapSourceRow(row) {
  let config = null;
  if (row.config_json) { try { config = JSON.parse(row.config_json); } catch { config = null; } }
  return {
    id: Number(row.id),
    key: row.key,
    label: row.label,
    providerType: row.provider_type,
    config,
    secretRef: row.secret_ref || null,
    isActive: Boolean(row.is_active),
  };
}

function mapTableRow(row) {
  return {
    id: Number(row.id),
    key: row.key,
    label: row.label,
    description: row.description || null,
    sourceId: Number(row.source_id),
    sourceEntity: row.source_entity,
    keyFields: row.key_fields || null,
    cacheMode: row.cache_mode,
    staleMinutes: Number(row.stale_minutes),
    maxRows: Number(row.max_rows),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order),
  };
}

const TABLE_COLUMNS = `
  id, [key], label, description, source_id, source_entity, key_fields,
  cache_mode, stale_minutes, max_rows, is_active, sort_order
`;

// ---------------------------------------------------------------------------
// Bronnen (tb_sources)
// ---------------------------------------------------------------------------
async function listSources() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT id, [key], label, provider_type, config_json, secret_ref, is_active
    FROM dbo.tb_sources ORDER BY label
  `);
  return result.recordset.map(mapSourceRow);
}

async function getSource(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, id)
    .query(`
      SELECT id, [key], label, provider_type, config_json, secret_ref, is_active
      FROM dbo.tb_sources WHERE id = @id
    `);
  return result.recordset.length ? mapSourceRow(result.recordset[0]) : null;
}

// Verbindingstest via de provider: capabilities ophalen + (indien mogelijk) $metadata bereikbaar.
async function testSource(id) {
  const source = await getSource(id);
  if (!source) throw Object.assign(new Error('Bron niet gevonden'), { status: 404 });

  const provider = getProvider(source.providerType);
  const capabilities = provider.capabilities();

  // Als de provider velddiscovery kan, is $metadata bereikbaar een goede rooktest. We proberen dat
  // alleen als de bron dat ondersteunt; fouten worden als 'niet verbonden' teruggegeven i.p.v. te gooien.
  let ok = true;
  let message = 'Bron bereikbaar';
  if (capabilities.discoverFields) {
    try {
      // Een lichte discover op de default-entiteit (PurchaseOrderHeadersV2) forceert het ophalen van $metadata.
      await provider.discoverFields({ sourceEntity: '/data/PurchaseOrderHeadersV2', relation: null });
    } catch (err) {
      ok = false;
      message = err && err.message ? err.message : 'Bron niet bereikbaar';
    }
  }
  return { ok, sourceId: source.id, providerType: source.providerType, capabilities, message };
}

// Ontdek de beschikbare entiteiten van een bron zodat de admin er één kan KIEZEN i.p.v. te typen.
// Filtert server-side op `q` (case-insensitive substring op name) en capt op `limit` (default 50, max 200).
// Return { entities, total, truncated } — total = aantal treffers vóór de cap.
async function discoverEntities(sourceId, { q, limit } = {}) {
  const source = await getSource(sourceId);
  if (!source) throw Object.assign(new Error('Bron niet gevonden'), { status: 404 });

  const provider = getProvider(source.providerType);
  const caps = provider.capabilities();
  if (!caps.discoverEntities) {
    throw Object.assign(new Error('Deze bron ondersteunt geen entiteit-discovery'), { status: 501 });
  }

  const all = await provider.discoverEntities();

  const needle = String(q || '').trim().toLowerCase();
  const matched = needle
    ? all.filter((e) => String(e.name || '').toLowerCase().includes(needle))
    : all;

  let cap = Number.parseInt(limit, 10);
  if (!Number.isFinite(cap) || cap <= 0) cap = 50;
  if (cap > 200) cap = 200;

  const entities = matched.slice(0, cap);
  return { entities, total: matched.length, truncated: matched.length > entities.length };
}

// ---------------------------------------------------------------------------
// Tabellen (tb_tables)
// ---------------------------------------------------------------------------
async function listTables({ includeInactive = false } = {}) {
  const pool = await getPool();
  const where = includeInactive ? '' : 'WHERE is_active = 1';
  const result = await pool.request().query(`
    SELECT ${TABLE_COLUMNS} FROM dbo.tb_tables ${where} ORDER BY sort_order, label
  `);
  return result.recordset.map(mapTableRow);
}

async function getTable(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, id)
    .query(`SELECT ${TABLE_COLUMNS} FROM dbo.tb_tables WHERE id = @id`);
  if (!result.recordset.length) throw Object.assign(new Error('Tabel niet gevonden'), { status: 404 });
  const table = mapTableRow(result.recordset[0]);
  const [relation, master, detail] = await Promise.all([
    getRelation(id),
    listColumns({ tableId: id, scope: 'master', includeInactive: true }),
    listColumns({ tableId: id, scope: 'detail', includeInactive: true }),
  ]);
  return { ...table, relation, columns: { master, detail } };
}

function validateTableInput(input, { partial = false } = {}) {
  const out = {};
  if (!partial || input.label !== undefined) out.label = requireText(input.label, 'Label');
  if (!partial || input.description !== undefined) {
    out.description = requireText(input.description, 'Omschrijving', { max: 512, required: false });
  }
  if (!partial || input.sourceEntity !== undefined) {
    out.sourceEntity = requireText(input.sourceEntity, 'Bron-entiteit', { max: MAX_ENTITY });
  }
  if (!partial || input.keyFields !== undefined) {
    out.keyFields = requireText(input.keyFields, 'Sleutelvelden', { max: MAX_ENTITY, required: false });
  }
  if (!partial || input.cacheMode !== undefined) {
    const mode = String(input.cacheMode || 'auto');
    if (!CACHE_MODES.includes(mode)) throw Object.assign(new Error('Ongeldige cache-modus'), { status: 400 });
    out.cacheMode = mode;
  }
  if (!partial || input.staleMinutes !== undefined) {
    const n = Number.parseInt(input.staleMinutes, 10);
    out.staleMinutes = Number.isFinite(n) && n > 0 ? n : 15;
  }
  if (!partial || input.maxRows !== undefined) {
    const n = Number.parseInt(input.maxRows, 10);
    out.maxRows = Number.isFinite(n) && n > 0 ? n : 2000;
  }
  return out;
}

async function createTable(input, userId) {
  const pool = await getPool();
  const clean = validateTableInput(input || {}, { partial: false });

  const sourceId = Number.parseInt(input.sourceId, 10);
  if (!Number.isFinite(sourceId)) throw Object.assign(new Error('Bron (sourceId) is verplicht'), { status: 400 });
  const source = await getSource(sourceId);
  if (!source) throw Object.assign(new Error('Bron niet gevonden'), { status: 404 });

  const key = await uniqueTableKey(pool, input.key ? slugify(input.key) : slugify(clean.label));

  const result = await pool.request()
    .input('key', sql.NVarChar(64), key)
    .input('label', sql.NVarChar(128), clean.label)
    .input('description', sql.NVarChar(512), clean.description)
    .input('sourceId', sql.BigInt, sourceId)
    .input('sourceEntity', sql.NVarChar(256), clean.sourceEntity)
    .input('keyFields', sql.NVarChar(256), clean.keyFields)
    .input('cacheMode', sql.NVarChar(16), clean.cacheMode || 'auto')
    .input('staleMinutes', sql.Int, clean.staleMinutes ?? 15)
    .input('maxRows', sql.Int, clean.maxRows ?? 2000)
    .input('userId', sql.Int, userId || null)
    .query(`
      INSERT INTO dbo.tb_tables
        ([key], label, description, source_id, source_entity, key_fields, cache_mode, stale_minutes, max_rows, created_by, updated_by)
      OUTPUT ${outputCols('INSERTED')}
      VALUES
        (@key, @label, @description, @sourceId, @sourceEntity, @keyFields, @cacheMode, @staleMinutes, @maxRows, @userId, @userId)
    `);

  // Start "stale" zodat de eerste lazy refresh de cache opbouwt.
  const table = mapTableRow(result.recordset[0]);
  await pool.request()
    .input('tableId', sql.BigInt, table.id)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.tb_sync_state WHERE table_id = @tableId)
        INSERT INTO dbo.tb_sync_state (table_id, watermark, last_full_sync_at) VALUES (@tableId, NULL, NULL);
    `);

  logger.info('Table Builder: tabel aangemaakt', { tableId: table.id, key: table.key, userId });
  return table;
}

async function updateTable(id, input, userId) {
  const clean = validateTableInput(input || {}, { partial: true });
  const setClauses = [];
  const pool = await getPool();
  const request = pool.request().input('id', sql.BigInt, id).input('userId', sql.Int, userId || null);

  const map = {
    label: ['label', sql.NVarChar(128)],
    description: ['description', sql.NVarChar(512)],
    sourceEntity: ['source_entity', sql.NVarChar(256)],
    keyFields: ['key_fields', sql.NVarChar(256)],
    cacheMode: ['cache_mode', sql.NVarChar(16)],
    staleMinutes: ['stale_minutes', sql.Int],
    maxRows: ['max_rows', sql.Int],
  };
  for (const [field, [col, type]] of Object.entries(map)) {
    if (clean[field] !== undefined) {
      setClauses.push(`${col} = @${field}`);
      request.input(field, type, clean[field]);
    }
  }
  if (input && input.sourceId !== undefined) {
    const sourceId = Number.parseInt(input.sourceId, 10);
    if (!Number.isFinite(sourceId)) throw Object.assign(new Error('Ongeldige bron'), { status: 400 });
    const source = await getSource(sourceId);
    if (!source) throw Object.assign(new Error('Bron niet gevonden'), { status: 404 });
    setClauses.push('source_id = @sourceId');
    request.input('sourceId', sql.BigInt, sourceId);
  }
  if (!setClauses.length) throw Object.assign(new Error('Geen velden opgegeven'), { status: 400 });
  setClauses.push('updated_by = @userId', 'updated_at = SYSUTCDATETIME()');

  const result = await request.query(`
    UPDATE dbo.tb_tables SET ${setClauses.join(', ')}
    OUTPUT ${outputCols('INSERTED')}
    WHERE id = @id
  `);
  if (!result.recordset.length) throw Object.assign(new Error('Tabel niet gevonden'), { status: 404 });
  return mapTableRow(result.recordset[0]);
}

async function deactivateTable(id, userId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, id)
    .input('userId', sql.Int, userId || null)
    .query(`
      UPDATE dbo.tb_tables SET is_active = 0, updated_by = @userId, updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id WHERE id = @id
    `);
  if (!result.recordset.length) throw Object.assign(new Error('Tabel niet gevonden'), { status: 404 });
  return { id: Number(id), isActive: false };
}

function outputCols(prefix) {
  return `${prefix}.id, ${prefix}.[key], ${prefix}.label, ${prefix}.description, ${prefix}.source_id,
          ${prefix}.source_entity, ${prefix}.key_fields, ${prefix}.cache_mode, ${prefix}.stale_minutes,
          ${prefix}.max_rows, ${prefix}.is_active, ${prefix}.sort_order`;
}

async function uniqueTableKey(pool, desired) {
  const existing = await pool.request().query('SELECT [key] FROM dbo.tb_tables');
  const taken = new Set(existing.recordset.map((r) => r.key));
  if (!taken.has(desired)) return desired;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = (desired + '-' + i).slice(0, MAX_KEY);
    if (!taken.has(candidate)) return candidate;
  }
  throw Object.assign(new Error('Kon geen unieke tabelsleutel bepalen'), { status: 409 });
}

// ---------------------------------------------------------------------------
// Master-detail-relatie (tb_relations)
// ---------------------------------------------------------------------------
async function getRelation(tableId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .query(`
      SELECT detail_source_entity, relation_kind, detail_key_fields, join_keys_json
      FROM dbo.tb_relations WHERE table_id = @tableId
    `);
  if (!result.recordset.length) return null;
  const row = result.recordset[0];
  let joinKeys = null;
  if (row.join_keys_json) { try { joinKeys = JSON.parse(row.join_keys_json); } catch { joinKeys = null; } }
  return {
    detailSourceEntity: row.detail_source_entity || null,
    kind: row.relation_kind,
    detailKeyFields: row.detail_key_fields || null,
    joinKeys,
  };
}

async function setRelation(tableId, input) {
  const kind = String(input && input.kind ? input.kind : 'expand');
  if (!RELATION_KINDS.includes(kind)) throw Object.assign(new Error('Ongeldige relatie-soort'), { status: 400 });

  const detailEntity = requireText(input.detailSourceEntity, 'Detail-entiteit', {
    max: MAX_ENTITY, required: kind !== 'none',
  });
  const detailKeyFields = requireText(input.detailKeyFields, 'Detail-sleutelvelden', {
    max: MAX_ENTITY, required: false,
  });
  const joinKeysJson = input.joinKeys ? JSON.stringify(input.joinKeys) : null;

  // Bestaan van de tabel afdwingen (FK-fout wordt anders een lelijke 500).
  await getTable(tableId);

  const pool = await getPool();
  await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .input('detailEntity', sql.NVarChar(256), detailEntity)
    .input('kind', sql.NVarChar(16), kind)
    .input('detailKeyFields', sql.NVarChar(256), detailKeyFields)
    .input('joinKeys', sql.NVarChar(sql.MAX), joinKeysJson)
    .query(`
      MERGE dbo.tb_relations AS target
      USING (SELECT @tableId AS table_id) AS src ON target.table_id = src.table_id
      WHEN MATCHED THEN UPDATE SET
        detail_source_entity = @detailEntity, relation_kind = @kind,
        detail_key_fields = @detailKeyFields, join_keys_json = @joinKeys
      WHEN NOT MATCHED THEN INSERT (table_id, detail_source_entity, relation_kind, detail_key_fields, join_keys_json)
        VALUES (@tableId, @detailEntity, @kind, @detailKeyFields, @joinKeys);
    `);
  return getRelation(tableId);
}

// ---------------------------------------------------------------------------
// Velddiscovery + kolommen cureren (tb_columns, source='source')
// ---------------------------------------------------------------------------
async function discoverFields(tableId) {
  const table = await getTableByKeyById(tableId);
  const provider = getProviderForTable(table);
  const caps = provider.capabilities();
  if (!caps.discoverFields) {
    throw Object.assign(new Error('Deze bron ondersteunt geen velddiscovery'), { status: 501 });
  }

  const fields = await provider.discoverFields({
    source: table.source,
    sourceEntity: table.sourceEntity,
    relation: table.relation,
  });

  // Markeer welke velden al gecureerd zijn (source_field bezet in tb_columns) zodat de picker die
  // kan uitgrijzen; we filteren ze niet weg zodat de admin ook al-gekozen velden ziet.
  const existing = await listColumns({ tableId, includeInactive: true });
  const curated = new Set(
    existing.filter((c) => c.source === 'source' && c.sourceField).map((c) => `${c.scope}|${c.sourceField}`),
  );

  return fields.map((f) => ({ ...f, alreadyCurated: curated.has(`${f.scope}|${f.field}`) }));
}

// Cureer bronvelden: kies velden + NL-label + data_type + zichtbaarheid/filter/sort -> upsert in tb_columns
// (source='source'). Idempotent per (scope, source_field): bestaande bronkolom wordt bijgewerkt.
async function curateColumns(tableId, columns, userId) {
  if (!Array.isArray(columns) || !columns.length) {
    throw Object.assign(new Error('Geef minimaal één kolom op'), { status: 400 });
  }
  const table = await getTableByKeyById(tableId);
  const pool = await getPool();
  const results = [];

  for (const col of columns) {
    const scope = String(col.scope || '');
    if (!SCOPES.includes(scope)) throw Object.assign(new Error(`Ongeldige scope '${scope}'`), { status: 400 });
    const sourceField = requireText(col.sourceField || col.field, 'Bronveld', { max: 128 });
    const label = requireText(col.label, 'Label', { max: MAX_LABEL });
    const dataType = String(col.dataType || 'text');
    if (!DATA_TYPES.includes(dataType)) throw Object.assign(new Error(`Ongeldig datatype '${dataType}'`), { status: 400 });

    let optionsJson = null;
    if (dataType === 'select') {
      const list = Array.isArray(col.options) ? col.options.map((o) => String(o || '').trim()).filter(Boolean) : [];
      optionsJson = list.length ? JSON.stringify(list) : null;
    }

    const key = requireText(col.key, 'key', { max: MAX_KEY, required: false }) || slugToColumnKey(sourceField);
    const isDefaultVisible = col.isDefaultVisible === undefined ? true : Boolean(col.isDefaultVisible);
    const filterable = col.filterable === undefined ? true : Boolean(col.filterable);
    const sortable = col.sortable === undefined ? true : Boolean(col.sortable);

    const result = await pool.request()
      .input('tableId', sql.BigInt, table.id)
      .input('scope', sql.NVarChar(16), scope)
      .input('key', sql.NVarChar(64), key)
      .input('label', sql.NVarChar(128), label)
      .input('sourceField', sql.NVarChar(128), sourceField)
      .input('dataType', sql.NVarChar(16), dataType)
      .input('options', sql.NVarChar(sql.MAX), optionsJson)
      .input('isDefaultVisible', sql.Bit, isDefaultVisible ? 1 : 0)
      .input('filterable', sql.Bit, filterable ? 1 : 0)
      .input('sortable', sql.Bit, sortable ? 1 : 0)
      .input('userId', sql.Int, userId || null)
      .query(`
        MERGE dbo.tb_columns AS target
        USING (SELECT @tableId AS table_id, @scope AS scope, @sourceField AS source_field) AS src
          ON target.table_id = src.table_id AND target.scope = src.scope
             AND target.source = 'source' AND target.source_field = src.source_field
        WHEN MATCHED THEN UPDATE SET
          [key] = @key, label = @label, data_type = @dataType, options_json = @options,
          is_default_visible = @isDefaultVisible, filterable = @filterable, sortable = @sortable,
          is_active = 1, updated_by = @userId, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT
          (table_id, scope, [key], label, source, source_field, data_type, options_json,
           is_default_visible, filterable, sortable, is_active, sort_order, created_by, updated_by)
          VALUES (@tableId, @scope, @key, @label, 'source', @sourceField, @dataType, @options,
                  @isDefaultVisible, @filterable, @sortable, 1,
                  (SELECT ISNULL(MAX(sort_order), 0) + 10 FROM dbo.tb_columns WHERE table_id = @tableId AND scope = @scope),
                  @userId, @userId)
        OUTPUT INSERTED.id, INSERTED.table_id, INSERTED.scope, INSERTED.[key], INSERTED.label, INSERTED.source,
               INSERTED.source_field, INSERTED.data_type, INSERTED.options_json, INSERTED.writable,
               INSERTED.write_mechanism, INSERTED.is_default_visible, INSERTED.filterable, INSERTED.sortable,
               INSERTED.is_active, INSERTED.sort_order;
      `);
    results.push(mapColumnRow(result.recordset[0]));
  }

  logger.info('Table Builder: bronkolommen gecureerd', { tableId, aantal: results.length, userId });
  return results;
}

// Resolve een tabel-definitie (met source + relation) op numeriek id. Hergebruikt getTableByKey.
async function getTableByKeyById(tableId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, tableId)
    .query('SELECT [key] FROM dbo.tb_tables WHERE id = @id');
  if (!result.recordset.length) throw Object.assign(new Error('Tabel niet gevonden'), { status: 404 });
  return getTableByKey(result.recordset[0].key);
}

function slugToColumnKey(sourceField) {
  const base = String(sourceField || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_KEY);
  return base || 'veld';
}

module.exports = {
  // tabellen
  listTables,
  getTable,
  createTable,
  updateTable,
  deactivateTable,
  // bronnen
  listSources,
  getSource,
  testSource,
  discoverEntities,
  // relatie
  getRelation,
  setRelation,
  // velden/kolommen
  discoverFields,
  curateColumns,
  // exports voor tests
  slugify,
  slugToColumnKey,
  CACHE_MODES,
  RELATION_KINDS,
};
