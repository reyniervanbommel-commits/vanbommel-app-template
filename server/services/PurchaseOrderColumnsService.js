'use strict';

// Beheer van de uniforme PO-kolomregistry (po_columns): D365-velden én eigen kolommen.
// Fase 1 (#AB:132): toevoegen / hernoemen / soft-delete van eigen kolommen.
// Write-back-config (setWriteBackConfig) volgt in Fase 3.

const sql = require('mssql');

const LEVELS = ['header', 'line'];
const DATA_TYPES = ['text', 'number', 'date', 'boolean', 'select'];
const MAX_LABEL_LENGTH = 128;
const MAX_KEY_LENGTH = 64;

function getPool() {
  return sql.connect(process.env.SQL_CONNECTION_STRING);
}

// D365-velden die nooit terugschrijfbaar zijn: sleutelvelden + boekings-/systeemgestuurde velden.
// Write-back kan hier niet op aangezet worden (de toggle staat uit in de UI).
const NON_WRITABLE_KEYS = {
  header: ['orderNumber', 'status', 'createdDateTime'],
  line: ['lineNumber'],
};

// Identificerende kolommen die nooit verborgen mogen worden: zonder deze sleutels
// is een rij in de tabel niet meer herleidbaar naar een order/regel.
const NON_HIDEABLE_KEYS = {
  header: ['orderNumber'],
  line: ['lineNumber'],
};

function isWriteBackAllowed(col) {
  if (col.source !== 'd365' || !col.d365Field) return false;
  return !(NON_WRITABLE_KEYS[col.level] || []).includes(col.key);
}

function isHideAllowed(col) {
  return !(NON_HIDEABLE_KEYS[col.level] || []).includes(col.key);
}

function mapColumnRow(row) {
  let options = null;
  if (row.options) {
    try {
      options = JSON.parse(row.options);
    } catch {
      options = null;
    }
  }
  return {
    id: Number(row.id),
    key: row.key,
    label: row.label,
    source: row.source,
    level: row.level,
    dataType: row.data_type,
    options,
    d365Field: row.d365_field || null,
    writableToD365: Boolean(row.writable_to_d365),
    writeMechanism: row.write_mechanism || null,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order),
    // Mag write-back hierop aangezet worden? (false voor sleutel/boekings-/systeemvelden en custom)
    writeBackAllowed: isWriteBackAllowed({ source: row.source, d365Field: row.d365_field || null, level: row.level, key: row.key }),
    // Mag deze kolom verborgen worden? (false voor identificerende sleutelkolommen)
    hideAllowed: isHideAllowed({ level: row.level, key: row.key }),
  };
}

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

async function listColumns({ level = null, includeInactive = false } = {}) {
  const pool = await getPool();
  const request = pool.request();
  const conditions = [];

  if (level) {
    request.input('level', sql.NVarChar(16), level);
    conditions.push('[level] = @level');
  }
  if (!includeInactive) {
    conditions.push('is_active = 1');
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const result = await request.query(`
    SELECT id, [key], label, source, [level], data_type, options, d365_field,
           writable_to_d365, write_mechanism, is_active, sort_order
    FROM dbo.po_columns
    ${where}
    ORDER BY [level], sort_order, label
  `);

  return result.recordset.map(mapColumnRow);
}

async function getColumnById(columnId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, columnId)
    .query(`
      SELECT id, [key], label, source, [level], data_type, options, d365_field,
             writable_to_d365, write_mechanism, is_active, sort_order
      FROM dbo.po_columns
      WHERE id = @id
    `);
  return result.recordset.length ? mapColumnRow(result.recordset[0]) : null;
}

async function uniqueKeyForLevel(pool, level, desiredKey) {
  const existing = await pool.request()
    .input('level', sql.NVarChar(16), level)
    .query('SELECT [key] FROM dbo.po_columns WHERE [level] = @level');
  const taken = new Set(existing.recordset.map((r) => r.key));
  if (!taken.has(desiredKey)) return desiredKey;

  for (let i = 2; i < 1000; i += 1) {
    const candidate = (desiredKey + '_' + i).slice(0, MAX_KEY_LENGTH);
    if (!taken.has(candidate)) return candidate;
  }
  throw Object.assign(new Error('Kon geen unieke kolomsleutel bepalen'), { status: 409 });
}

async function createColumn({ label, level, dataType, options = null }, userId) {
  const cleanLabel = String(label || '').trim().slice(0, MAX_LABEL_LENGTH);
  if (!cleanLabel) {
    throw Object.assign(new Error('Label is verplicht'), { status: 400 });
  }
  if (!LEVELS.includes(level)) {
    throw Object.assign(new Error('Ongeldig niveau (header of line)'), { status: 400 });
  }
  if (!DATA_TYPES.includes(dataType)) {
    throw Object.assign(new Error('Ongeldig datatype'), { status: 400 });
  }

  let optionsJson = null;
  if (dataType === 'select') {
    const list = Array.isArray(options)
      ? options.map((o) => String(o || '').trim()).filter(Boolean)
      : [];
    if (!list.length) {
      throw Object.assign(new Error('Een keuzelijst vereist minimaal één optie'), { status: 400 });
    }
    optionsJson = JSON.stringify(list);
  }

  const pool = await getPool();
  const key = await uniqueKeyForLevel(pool, level, slugify(cleanLabel));

  const result = await pool.request()
    .input('key', sql.NVarChar(64), key)
    .input('label', sql.NVarChar(128), cleanLabel)
    .input('level', sql.NVarChar(16), level)
    .input('dataType', sql.NVarChar(16), dataType)
    .input('options', sql.NVarChar(sql.MAX), optionsJson)
    .input('userId', sql.Int, userId || null)
    .query(`
      INSERT INTO dbo.po_columns
        ([key], label, source, [level], data_type, options, writable_to_d365, is_active, sort_order, created_by, updated_by)
      OUTPUT INSERTED.id, INSERTED.[key], INSERTED.label, INSERTED.source, INSERTED.[level],
             INSERTED.data_type, INSERTED.options, INSERTED.d365_field, INSERTED.writable_to_d365,
             INSERTED.write_mechanism, INSERTED.is_active, INSERTED.sort_order
      VALUES
        (@key, @label, 'custom', @level, @dataType, @options, 0, 1,
         (SELECT ISNULL(MAX(sort_order), 0) + 10 FROM dbo.po_columns WHERE [level] = @level),
         @userId, @userId)
    `);

  return mapColumnRow(result.recordset[0]);
}

async function renameColumn(columnId, label, userId) {
  const cleanLabel = String(label || '').trim().slice(0, MAX_LABEL_LENGTH);
  if (!cleanLabel) {
    throw Object.assign(new Error('Label is verplicht'), { status: 400 });
  }

  const existing = await getColumnById(columnId);
  if (!existing) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  if (existing.source !== 'custom') {
    throw Object.assign(new Error('D365-kolommen kunnen niet hernoemd worden'), { status: 400 });
  }

  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, columnId)
    .input('label', sql.NVarChar(128), cleanLabel)
    .input('userId', sql.Int, userId || null)
    .query(`
      UPDATE dbo.po_columns
      SET label = @label, updated_by = @userId, updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id, INSERTED.[key], INSERTED.label, INSERTED.source, INSERTED.[level],
             INSERTED.data_type, INSERTED.options, INSERTED.d365_field, INSERTED.writable_to_d365,
             INSERTED.write_mechanism, INSERTED.is_active, INSERTED.sort_order
      WHERE id = @id
    `);

  if (!result.recordset.length) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  return mapColumnRow(result.recordset[0]);
}

// Soft-delete: alleen eigen kolommen. D365-velden blijven altijd bestaan (read-only referentie).
async function deactivateColumn(columnId, userId) {
  const pool = await getPool();
  const existing = await getColumnById(columnId);
  if (!existing) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  if (existing.source !== 'custom') {
    throw Object.assign(new Error('D365-kolommen kunnen niet verwijderd worden'), { status: 400 });
  }

  await pool.request()
    .input('id', sql.BigInt, columnId)
    .input('userId', sql.Int, userId || null)
    .query(`
      UPDATE dbo.po_columns
      SET is_active = 0, updated_by = @userId, updated_at = SYSUTCDATETIME()
      WHERE id = @id
    `);

  return { id: columnId, isActive: false };
}

// Zichtbaarheid (admin-only): toon/verberg een kolom in het PO-scherm via is_active.
// Werkt op D365- én eigen kolommen; identificerende sleutelkolommen kunnen niet verborgen worden.
async function setColumnVisibility(columnId, visible, userId) {
  const existing = await getColumnById(columnId);
  if (!existing) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  const isVisible = visible === true || visible === 'true' || visible === 1 || visible === '1';
  if (!isVisible && !isHideAllowed({ level: existing.level, key: existing.key })) {
    throw Object.assign(new Error('Deze sleutelkolom kan niet verborgen worden'), { status: 400 });
  }

  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, columnId)
    .input('active', sql.Bit, isVisible ? 1 : 0)
    .input('userId', sql.Int, userId || null)
    .query(`
      UPDATE dbo.po_columns
      SET is_active = @active, updated_by = @userId, updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id, INSERTED.[key], INSERTED.label, INSERTED.source, INSERTED.[level],
             INSERTED.data_type, INSERTED.options, INSERTED.d365_field, INSERTED.writable_to_d365,
             INSERTED.write_mechanism, INSERTED.is_active, INSERTED.sort_order
      WHERE id = @id
    `);
  if (!result.recordset.length) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  return mapColumnRow(result.recordset[0]);
}

// Write-back-config (admin-only): markeer een D365-kolom als terugschrijfbaar (#134).
const WRITE_MECHANISMS = ['patch', 'action'];

async function setWriteBackConfig(columnId, { writable, mechanism }) {
  const existing = await getColumnById(columnId);
  if (!existing) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  if (existing.source !== 'd365' || !existing.d365Field) {
    throw Object.assign(new Error('Write-back kan alleen op D365-velden worden ingesteld'), { status: 400 });
  }
  if (!isWriteBackAllowed({ source: existing.source, d365Field: existing.d365Field, level: existing.level, key: existing.key })) {
    throw Object.assign(new Error('Dit veld is niet terugschrijfbaar (sleutel of boekings-/systeemveld)'), { status: 400 });
  }
  const isWritable = writable === true || writable === 'true' || writable === 1 || writable === '1';
  const mech = isWritable ? (WRITE_MECHANISMS.includes(mechanism) ? mechanism : 'patch') : null;

  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, columnId)
    .input('writable', sql.Bit, isWritable ? 1 : 0)
    .input('mechanism', sql.NVarChar(16), mech)
    .query(`
      UPDATE dbo.po_columns
      SET writable_to_d365 = @writable, write_mechanism = @mechanism, updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.id, INSERTED.[key], INSERTED.label, INSERTED.source, INSERTED.[level],
             INSERTED.data_type, INSERTED.options, INSERTED.d365_field, INSERTED.writable_to_d365,
             INSERTED.write_mechanism, INSERTED.is_active, INSERTED.sort_order
      WHERE id = @id
    `);
  if (!result.recordset.length) {
    throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  }
  return mapColumnRow(result.recordset[0]);
}

module.exports = {
  LEVELS,
  DATA_TYPES,
  WRITE_MECHANISMS,
  NON_WRITABLE_KEYS,
  NON_HIDEABLE_KEYS,
  isWriteBackAllowed,
  isHideAllowed,
  listColumns,
  getColumnById,
  createColumn,
  renameColumn,
  deactivateColumn,
  setColumnVisibility,
  setWriteBackConfig,
  slugify,
};
