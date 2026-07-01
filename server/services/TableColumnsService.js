'use strict';

// Beheer van app-native (eigen) kolommen in de Table Builder-registry (tb_columns). Fase A (#AB:152).
// Generalisatie van PurchaseOrderColumnsService: tableKey-gedreven, scope master|detail, source 'custom'.
// Bronvelden (source='source') worden niet hier beheerd maar via de admin TableBuilder (Fase B).

const sql = require('mssql');
const { getPool, getTableByKey, getColumnById, mapColumnRow, SCOPES, DATA_TYPES } = require('./TableRegistryService');

const MAX_LABEL_LENGTH = 128;
const MAX_KEY_LENGTH = 64;

function slugify(label) {
  const base = String(label || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_KEY_LENGTH);
  return base || 'kolom';
}

async function uniqueKeyForScope(pool, tableId, scope, desiredKey) {
  const existing = await pool.request()
    .input('tableId', sql.BigInt, tableId)
    .input('scope', sql.NVarChar(16), scope)
    .query('SELECT [key] FROM dbo.tb_columns WHERE table_id = @tableId AND scope = @scope');
  const taken = new Set(existing.recordset.map((r) => r.key));
  if (!taken.has(desiredKey)) return desiredKey;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = (desiredKey + '_' + i).slice(0, MAX_KEY_LENGTH);
    if (!taken.has(candidate)) return candidate;
  }
  throw Object.assign(new Error('Kon geen unieke kolomsleutel bepalen'), { status: 409 });
}

const COLUMN_OUTPUT = `
  OUTPUT INSERTED.id, INSERTED.table_id, INSERTED.scope, INSERTED.[key], INSERTED.label, INSERTED.source,
         INSERTED.source_field, INSERTED.data_type, INSERTED.options_json, INSERTED.writable,
         INSERTED.write_mechanism, INSERTED.is_default_visible, INSERTED.filterable, INSERTED.sortable,
         INSERTED.is_active, INSERTED.sort_order
`;

async function createColumn({ tableKey, scope, label, dataType, options = null }, userId) {
  const table = await getTableByKey(tableKey);
  const cleanLabel = String(label || '').trim().slice(0, MAX_LABEL_LENGTH);
  if (!cleanLabel) throw Object.assign(new Error('Label is verplicht'), { status: 400 });
  if (!SCOPES.includes(scope)) throw Object.assign(new Error('Ongeldige scope (master of detail)'), { status: 400 });
  if (!DATA_TYPES.includes(dataType)) throw Object.assign(new Error('Ongeldig datatype'), { status: 400 });

  let optionsJson = null;
  if (dataType === 'select') {
    const list = Array.isArray(options) ? options.map((o) => String(o || '').trim()).filter(Boolean) : [];
    if (!list.length) throw Object.assign(new Error('Een keuzelijst vereist minimaal één optie'), { status: 400 });
    optionsJson = JSON.stringify(list);
  }

  const pool = await getPool();
  const key = await uniqueKeyForScope(pool, table.id, scope, slugify(cleanLabel));
  const result = await pool.request()
    .input('tableId', sql.BigInt, table.id)
    .input('scope', sql.NVarChar(16), scope)
    .input('key', sql.NVarChar(64), key)
    .input('label', sql.NVarChar(128), cleanLabel)
    .input('dataType', sql.NVarChar(16), dataType)
    .input('options', sql.NVarChar(sql.MAX), optionsJson)
    .input('userId', sql.Int, userId || null)
    .query(`
      INSERT INTO dbo.tb_columns
        (table_id, scope, [key], label, source, data_type, options_json, writable, is_active, sort_order, created_by, updated_by)
      ${COLUMN_OUTPUT}
      VALUES
        (@tableId, @scope, @key, @label, 'custom', @dataType, @options, 0, 1,
         (SELECT ISNULL(MAX(sort_order), 0) + 10 FROM dbo.tb_columns WHERE table_id = @tableId AND scope = @scope),
         @userId, @userId)
    `);
  return mapColumnRow(result.recordset[0]);
}

async function renameColumn(columnId, label, userId) {
  const cleanLabel = String(label || '').trim().slice(0, MAX_LABEL_LENGTH);
  if (!cleanLabel) throw Object.assign(new Error('Label is verplicht'), { status: 400 });
  const existing = await getColumnById(columnId);
  if (!existing) throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  if (existing.source !== 'custom') throw Object.assign(new Error('Bronkolommen kunnen niet hernoemd worden'), { status: 400 });

  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, columnId)
    .input('label', sql.NVarChar(128), cleanLabel)
    .input('userId', sql.Int, userId || null)
    .query(`
      UPDATE dbo.tb_columns
      SET label = @label, updated_by = @userId, updated_at = SYSUTCDATETIME()
      ${COLUMN_OUTPUT}
      WHERE id = @id
    `);
  if (!result.recordset.length) throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  return mapColumnRow(result.recordset[0]);
}

// Soft-delete: alleen eigen kolommen. Bronvelden blijven bestaan (read-only referentie).
async function deactivateColumn(columnId, userId) {
  const existing = await getColumnById(columnId);
  if (!existing) throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  if (existing.source !== 'custom') throw Object.assign(new Error('Bronkolommen kunnen niet verwijderd worden'), { status: 400 });

  const pool = await getPool();
  await pool.request()
    .input('id', sql.BigInt, columnId)
    .input('userId', sql.Int, userId || null)
    .query(`
      UPDATE dbo.tb_columns
      SET is_active = 0, updated_by = @userId, updated_at = SYSUTCDATETIME()
      WHERE id = @id
    `);
  return { id: columnId, isActive: false };
}

module.exports = {
  SCOPES,
  DATA_TYPES,
  slugify,
  createColumn,
  renameColumn,
  deactivateColumn,
};
