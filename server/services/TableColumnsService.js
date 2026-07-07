'use strict';

// Beheer van app-native (eigen) kolommen in de Table Builder-registry (tb_columns). Fase A (#AB:152).
// Generalisatie van PurchaseOrderColumnsService: tableKey-gedreven, scope master|detail, source 'custom'.
// Bronvelden (source='source') worden niet hier beheerd maar via de admin TableBuilder (Fase B).

const sql = require('mssql');
const {
  getPool,
  getTableByKey,
  getColumnById,
  mapColumnRow,
  listColumns,
  SCOPES,
  DATA_TYPES,
} = require('./TableRegistryService');
const {
  findDependentFormulaColumn,
  normalizeFormulaExpression,
  validateFormulaReferences,
  validateFormulaResultTypeCompatibility,
} = require('../utils/tableColumnFormulaValidation');

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
         INSERTED.is_active, INSERTED.sort_order, INSERTED.visible_at_delete, INSERTED.formula_expr
`;

const WRITE_MECHANISMS = ['patch', 'action', 'sql'];

// Pure validatie/normalisatie van write-back-config (#AB:170). writable=false => mechanism altijd null.
function resolveWriteback({ writable, mechanism }) {
  const writableBit = writable === true || writable === 'true' || writable === 1 || writable === '1' ? 1 : 0;
  if (!writableBit) return { writable: 0, mechanism: null };
  const mech = mechanism == null || mechanism === '' ? 'patch' : String(mechanism);
  if (!WRITE_MECHANISMS.includes(mech)) {
    throw Object.assign(new Error(`Ongeldig write-mechanisme '${mech}' (patch, action of sql)`), { status: 400 });
  }
  return { writable: 1, mechanism: mech };
}

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function validateImageTransform(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw badRequest(`Transform #${index + 1} moet een object zijn`);
  }
  const type = String(item.type || '').trim();
  switch (type) {
    case 'trim':
      return { type: 'trim' };
    case 'remove':
      if (typeof item.value !== 'string' || item.value.length === 0) {
        throw badRequest("Transform 'remove' vereist een niet-lege string 'value'");
      }
      return { type: 'remove', value: item.value };
    case 'replace':
      if (typeof item.from !== 'string' || item.from.length === 0) {
        throw badRequest("Transform 'replace' vereist een niet-lege string 'from'");
      }
      if (typeof item.to !== 'string') {
        throw badRequest("Transform 'replace' vereist een string 'to'");
      }
      return { type: 'replace', from: item.from, to: item.to };
    case 'substring': {
      if (!Number.isInteger(item.start) || item.start < 0) {
        throw badRequest("Transform 'substring' vereist een geheel getal 'start' >= 0");
      }
      const normalized = { type: 'substring', start: item.start };
      if (item.end !== undefined && item.end !== null) {
        if (!Number.isInteger(item.end)) {
          throw badRequest("Transform 'substring' veld 'end' moet een geheel getal zijn");
        }
        normalized.end = item.end;
      }
      return normalized;
    }
    default:
      throw badRequest(`Onbekend transform-type: ${type || 'leeg'}`);
  }
}

function validateImageOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw badRequest('Image-opties moeten een object zijn');
  }
  const { urlTemplate, sourceColumnKey, transforms } = options;
  if (typeof urlTemplate !== 'string' || urlTemplate.trim().length === 0) {
    throw badRequest('urlTemplate is verplicht');
  }
  const template = urlTemplate.trim();
  if (!/^https?:\/\//i.test(template)) {
    throw badRequest('urlTemplate moet beginnen met http:// of https://');
  }
  if (!template.includes('{xxx}')) {
    throw badRequest('urlTemplate moet de placeholder {xxx} bevatten');
  }
  if (typeof sourceColumnKey !== 'string' || sourceColumnKey.trim().length === 0) {
    throw badRequest('sourceColumnKey is verplicht');
  }
  let normalizedTransforms = [];
  if (transforms !== undefined && transforms !== null) {
    if (!Array.isArray(transforms)) {
      throw badRequest('transforms moet een array zijn');
    }
    normalizedTransforms = transforms.map(validateImageTransform);
  }
  return {
    urlTemplate: template,
    sourceColumnKey: sourceColumnKey.trim(),
    transforms: normalizedTransforms,
  };
}

async function createColumn({ tableKey, scope, label, dataType, options = null, formulaExpr = null }, userId) {
  const table = await getTableByKey(tableKey);
  const cleanLabel = String(label || '').trim().slice(0, MAX_LABEL_LENGTH);
  if (!cleanLabel) throw Object.assign(new Error('Label is verplicht'), { status: 400 });
  if (!SCOPES.includes(scope)) throw Object.assign(new Error('Ongeldige scope (master of detail)'), { status: 400 });
  if (!DATA_TYPES.includes(dataType)) throw Object.assign(new Error('Ongeldig datatype'), { status: 400 });
  const normalizedFormula = normalizeFormulaExpression(formulaExpr);
  const isFormulaColumn = Boolean(normalizedFormula.expression);
  if (isFormulaColumn && scope !== 'master') {
    throw Object.assign(new Error('Formulekolommen zijn alleen toegestaan op master-niveau'), { status: 400 });
  }

  let optionsJson = null;
  let normalizedImageOptions = null;
  if (dataType === 'select' && !isFormulaColumn) {
    const list = Array.isArray(options) ? options.map((o) => String(o || '').trim()).filter(Boolean) : [];
    if (!list.length) throw Object.assign(new Error('Een keuzelijst vereist minimaal één optie'), { status: 400 });
    optionsJson = JSON.stringify(list);
  }
  if (dataType === 'image') {
    if (scope !== 'master') {
      throw Object.assign(new Error('Image-kolommen zijn alleen toegestaan op master-niveau'), { status: 400 });
    }
    if (isFormulaColumn) {
      throw Object.assign(new Error('Formulekolommen ondersteunen geen image-datatype'), { status: 400 });
    }
    normalizedImageOptions = validateImageOptions(options);
    optionsJson = JSON.stringify(normalizedImageOptions);
  }
  if (isFormulaColumn && dataType === 'select') {
    throw Object.assign(new Error('Formulekolommen ondersteunen geen keuzelijst-datatype'), { status: 400 });
  }

  const pool = await getPool();
  if (dataType === 'image') {
    const sourceCheck = await pool.request()
      .input('tableId', sql.BigInt, table.id)
      .input('sourceColumnKey', sql.NVarChar(64), normalizedImageOptions.sourceColumnKey)
      .query(`
        SELECT 1
        FROM dbo.tb_columns
        WHERE table_id = @tableId
          AND scope = 'master'
          AND [key] = @sourceColumnKey
          AND is_active = 1
      `);
    if (!sourceCheck.recordset.length) {
      throw Object.assign(new Error('sourceColumnKey verwijst niet naar een bestaande master-kolom'), { status: 400 });
    }
  }
  const key = await uniqueKeyForScope(pool, table.id, scope, slugify(cleanLabel));
  if (isFormulaColumn) {
    const masterColumns = await listColumns({ tableId: table.id, scope: 'master', includeInactive: false });
    validateFormulaReferences(normalizedFormula.references, masterColumns, key);
    validateFormulaResultTypeCompatibility(
      normalizedFormula.expression,
      normalizedFormula.references,
      masterColumns,
      dataType
    );
  }
  const result = await pool.request()
    .input('tableId', sql.BigInt, table.id)
    .input('scope', sql.NVarChar(16), scope)
    .input('key', sql.NVarChar(64), key)
    .input('label', sql.NVarChar(128), cleanLabel)
    .input('dataType', sql.NVarChar(16), dataType)
    .input('options', sql.NVarChar(sql.MAX), optionsJson)
    .input('formulaExpr', sql.NVarChar(sql.MAX), normalizedFormula.expression)
    .input('userId', sql.Int, userId || null)
    .query(`
      INSERT INTO dbo.tb_columns
        (table_id, scope, [key], label, source, data_type, options_json, formula_expr, writable, is_active, sort_order, created_by, updated_by)
      ${COLUMN_OUTPUT}
      VALUES
        (@tableId, @scope, @key, @label, 'custom', @dataType, @options, @formulaExpr, 0, 1,
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

async function updateFormulaColumn(columnId, { label, dataType, formulaExpr }, userId) {
  const existing = await getColumnById(columnId);
  if (!existing) throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  if (existing.source !== 'custom') {
    throw Object.assign(new Error('Alleen eigen kolommen kunnen een formule hebben'), { status: 400 });
  }
  if (existing.scope !== 'master') {
    throw Object.assign(new Error('Alleen master-kolommen kunnen een formule hebben'), { status: 400 });
  }
  if (!String(existing.formulaExpr || '').trim()) {
    throw Object.assign(new Error('Deze kolom is geen formulekolom'), { status: 400 });
  }

  const cleanLabel = String(label || existing.label || '').trim().slice(0, MAX_LABEL_LENGTH);
  if (!cleanLabel) throw Object.assign(new Error('Label is verplicht'), { status: 400 });
  const nextDataType = dataType || existing.dataType;
  if (!DATA_TYPES.includes(nextDataType)) {
    throw Object.assign(new Error('Ongeldig datatype'), { status: 400 });
  }
  if (nextDataType === 'select' || nextDataType === 'image') {
    throw Object.assign(new Error('Formulekolommen ondersteunen geen keuzelijst- of image-datatype'), { status: 400 });
  }
  const normalizedFormula = normalizeFormulaExpression(formulaExpr !== undefined ? formulaExpr : existing.formulaExpr);
  if (!normalizedFormula.expression) {
    throw Object.assign(new Error('Formule is verplicht'), { status: 400 });
  }

  const masterColumns = await listColumns({ tableId: existing.tableId, scope: 'master', includeInactive: false });
  validateFormulaReferences(normalizedFormula.references, masterColumns, existing.key);
  validateFormulaResultTypeCompatibility(
    normalizedFormula.expression,
    normalizedFormula.references,
    masterColumns,
    nextDataType
  );

  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, columnId)
    .input('label', sql.NVarChar(128), cleanLabel)
    .input('dataType', sql.NVarChar(16), nextDataType)
    .input('formulaExpr', sql.NVarChar(sql.MAX), normalizedFormula.expression)
    .input('userId', sql.Int, userId || null)
    .query(`
      UPDATE dbo.tb_columns
      SET label = @label,
          data_type = @dataType,
          options_json = NULL,
          formula_expr = @formulaExpr,
          writable = 0,
          write_mechanism = NULL,
          updated_by = @userId,
          updated_at = SYSUTCDATETIME()
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
  if (existing.scope === 'master') {
    const formulaRows = await pool.request()
      .input('tableId', sql.BigInt, existing.tableId)
      .input('columnId', sql.BigInt, columnId)
      .query(`
        SELECT id, [key], label, formula_expr
        FROM dbo.tb_columns
        WHERE table_id = @tableId
          AND scope = 'master'
          AND is_active = 1
          AND source = 'custom'
          AND formula_expr IS NOT NULL
          AND id <> @columnId
      `);
    const dependent = findDependentFormulaColumn(formulaRows.recordset, existing.key);
    if (dependent) {
      throw Object.assign(
        new Error(`Kolom '${existing.label}' wordt gebruikt door formulekolom '${dependent.label}'`),
        { status: 409 }
      );
    }
  }

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

// Zichtbaarheid op het bord (admin): toggelt is_active. Werkt op elke kolom (bron + eigen).
// Pariteit met po_* setColumnVisibility; read()/listColumns tonen alleen is_active=1 kolommen.
async function setColumnVisibility(columnId, visible, userId) {
  const existing = await getColumnById(columnId);
  if (!existing) throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, columnId)
    .input('active', sql.Bit, visible ? 1 : 0)
    .input('userId', sql.Int, userId || null)
    .query(`
      UPDATE dbo.tb_columns
      SET is_active = @active, updated_by = @userId, updated_at = SYSUTCDATETIME()
      ${COLUMN_OUTPUT}
      WHERE id = @id
    `);
  if (!result.recordset.length) throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  return mapColumnRow(result.recordset[0]);
}

// Zichtbaar in de "verborgen orders in D365-filter"-popup (Fase 2). Los van is_active. Elke kolom.
async function setVisibleAtDelete(columnId, flag, userId) {
  const existing = await getColumnById(columnId);
  if (!existing) throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, columnId)
    .input('flag', sql.Bit, flag ? 1 : 0)
    .input('userId', sql.Int, userId || null)
    .query(`
      UPDATE dbo.tb_columns
      SET visible_at_delete = @flag, updated_by = @userId, updated_at = SYSUTCDATETIME()
      ${COLUMN_OUTPUT}
      WHERE id = @id
    `);
  if (!result.recordset.length) throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  return mapColumnRow(result.recordset[0]);
}

// Write-back-config (admin): welke kolommen naar de bron terugschrijfbaar zijn en via welk mechanisme.
async function setWriteBackConfig(columnId, config, userId) {
  const existing = await getColumnById(columnId);
  if (!existing) throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  const { writable, mechanism } = resolveWriteback(config || {});
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, columnId)
    .input('writable', sql.Bit, writable)
    .input('mechanism', sql.NVarChar(16), mechanism)
    .input('userId', sql.Int, userId || null)
    .query(`
      UPDATE dbo.tb_columns
      SET writable = @writable, write_mechanism = @mechanism, updated_by = @userId, updated_at = SYSUTCDATETIME()
      ${COLUMN_OUTPUT}
      WHERE id = @id
    `);
  if (!result.recordset.length) throw Object.assign(new Error('Kolom niet gevonden'), { status: 404 });
  return mapColumnRow(result.recordset[0]);
}

module.exports = {
  SCOPES,
  DATA_TYPES,
  slugify,
  resolveWriteback,
  validateImageOptions,
  normalizeFormulaExpression,
  validateFormulaReferences,
  findDependentFormulaColumn,
  validateFormulaResultTypeCompatibility,
  createColumn,
  renameColumn,
  updateFormulaColumn,
  deactivateColumn,
  setColumnVisibility,
  setVisibleAtDelete,
  setWriteBackConfig,
};
