'use strict';

// Excel-koppeling naar een hoofdtabel (#AB:162). Een geuploade Excel wordt een generieke tb_*-bron:
//   upload  -> tb_tables (cache_mode='never') + tb_columns(source='source') + tb_cache (scope master)
//   publish -> tb_relations relation_role='lookup' (exact hetzelfde fk_join-mechanisme als vendors/items).
// De leeslaag (TableDataService.read -> loadLookupEnrichment/applyLookups) verrijkt de hoofdtabel daarna
// zonder verdere wijziging; excel-doeltabellen matchen partitie-loos (zie TableDataService).
//
// Ontwerp-aannames (autonoom, #AB:162):
//  - Snapshot-is-leidend: er is geen externe bron om te pollen -> cache_mode='never' (refresh/isStale slaan over).
//  - Partitie-loos: tb_cache.partition_key = vaste sentinel; de match loopt op record_key = dataset-sleutelwaarde.
//  - Many-to-one: uniekheid alleen aan datasetzijde afgedwongen (bij publish), niet aan hoofdtabelzijde.

const crypto = require('crypto');
const XLSX = require('xlsx');
const sql = require('mssql');
const { logger } = require('../utils/logger');
const { getPool, getTableByKey, listColumns, invalidateTableCache } = require('./TableRegistryService');

const PARTITION_SENTINEL = '_';        // excel-datasets zijn partitie-loos
const MASTER_DETAIL_KEY = -1;          // master-rij sentinel (gelijk aan tb_cache-conventie)
const MAX_ROWS = 50000;                // harde rij-cap (read() bouwt alle rijen in geheugen)
const MAX_COLUMNS = 200;
const SAMPLE_LIMIT = 200;              // aantal waarden dat we samplen voor typedetectie
const EXCEL_KEY_PREFIX = 'excel-';
const CACHE_BULK_CHUNK_SIZE = 1000;    // batch-size voor snelle inserts zonder enorme payload

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slugify(text, fallback) {
  const base = String(text || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || fallback;
}

// Leid een stabiele, unieke kolom-key af uit een Excel-header (past in tb_columns.[key] NVARCHAR(64)).
function deriveColumnKey(header, index, used) {
  let key = String(header ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+(.)/g, (_, c) => c.toUpperCase())  // camelCase-achtig
    .replace(/[^A-Za-z0-9]/g, '');
  if (!key) key = `kolom${index + 1}`;
  if (/^[0-9]/.test(key)) key = `k${key}`;
  key = key.slice(0, 60);
  let candidate = key;
  let n = 2;
  while (used.has(candidate)) { candidate = `${key.slice(0, 58)}_${n}`; n += 1; }
  used.add(candidate);
  return candidate;
}

function isBlank(v) { return v === null || v === undefined || v === ''; }

function detectType(values) {
  const sample = values.filter((v) => !isBlank(v)).slice(0, SAMPLE_LIMIT);
  if (!sample.length) return 'text';
  // Identifiers met een leidende nul (bv. artikelnr "00123") NIET als getal classificeren: Number()
  // wist de nul en breekt de sleutel-match. Zulke kolommen blijven tekst (record_key = ruwe waarde).
  const hasLeadingZeroId = sample.some((v) => typeof v === 'string' && /^0\d/.test(v.trim()));
  const allNumber = !hasLeadingZeroId
    && sample.every((v) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.replace(',', '.')))));
  if (allNumber) return 'number';
  const allDate = sample.every((v) => v instanceof Date || (typeof v === 'string' && !Number.isNaN(Date.parse(v))));
  if (allDate && sample.some((v) => v instanceof Date)) return 'date';
  return 'text';
}

function normalizeCell(value, dataType) {
  if (isBlank(value)) return null;
  if (value instanceof Date) return value.toISOString();
  if (dataType === 'number' && typeof value === 'string') {
    const n = Number(value.replace(',', '.'));
    return Number.isFinite(n) ? n : value;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Parse: buffer -> { columns:[{key,label,dataType,samples}], rows:[{colKey:value}] }
// Beveiliging: eerste sheet, waarden (geen formules), harde rij/kolom-caps.
// ---------------------------------------------------------------------------
function parseWorkbook(buffer) {
  // Beveiliging (#AB:162): xlsx@0.18.5 (npm) kent CVE-2023-30533 (prototype pollution) + CVE-2024-22363
  // (ReDoS); een npm-fix is er niet (alleen via de SheetJS-CDN). Bewuste risico-acceptatie: upload is
  // admin-only (requireRole ADMIN), formules staan uit (cellFormula:false), en er gelden harde grootte-/
  // rij-/kolom-caps. Kolom-keys worden gestript (deriveColumnKey) zodat __proto__ niet als property landt.
  let wb;
  try {
    wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellFormula: false, cellHTML: false, dense: false });
  } catch (err) {
    throw Object.assign(new Error('Could not read file as Excel/CSV'), { status: 400 });
  }
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw Object.assign(new Error('The file contains no worksheet'), { status: 400 });
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: false });
  if (!matrix.length) throw Object.assign(new Error('The worksheet is empty'), { status: 400 });

  const headerRow = matrix[0] || [];
  const colCount = Math.min(headerRow.length, MAX_COLUMNS);
  if (colCount === 0) throw Object.assign(new Error('No columns found in the header row'), { status: 400 });

  const used = new Set();
  const columns = [];
  for (let c = 0; c < colCount; c += 1) {
    const label = isBlank(headerRow[c]) ? `Column ${c + 1}` : String(headerRow[c]).trim();
    columns.push({ index: c, key: deriveColumnKey(headerRow[c], c, used), label });
  }

  const dataRows = matrix.slice(1);
  if (dataRows.length > MAX_ROWS) {
    throw Object.assign(new Error(`Too many rows (${dataRows.length}); maximum is ${MAX_ROWS}`), { status: 400 });
  }

  // Typedetectie per kolom over de ruwe waarden.
  for (const col of columns) {
    col.dataType = detectType(dataRows.map((r) => (r ? r[col.index] : null)));
  }

  const rows = dataRows.map((r) => {
    const obj = {};
    for (const col of columns) obj[col.key] = normalizeCell(r ? r[col.index] : null, col.dataType);
    return obj;
  }).filter((obj) => Object.values(obj).some((v) => !isBlank(v))); // volledig lege rijen weg

  for (const col of columns) {
    col.samples = rows.map((r) => r[col.key]).filter((v) => !isBlank(v)).slice(0, 3);
    delete col.index;
  }
  return { columns, rows };
}

function createTbColumnsBulkTable() {
  const table = new sql.Table('dbo.tb_columns');
  table.columns.add('table_id', sql.BigInt, { nullable: false });
  table.columns.add('scope', sql.NVarChar(16), { nullable: false });
  table.columns.add('key', sql.NVarChar(64), { nullable: false });
  table.columns.add('label', sql.NVarChar(128), { nullable: false });
  table.columns.add('source', sql.NVarChar(16), { nullable: false });
  table.columns.add('source_field', sql.NVarChar(128), { nullable: true });
  table.columns.add('data_type', sql.NVarChar(16), { nullable: false });
  table.columns.add('writable', sql.Bit, { nullable: false });
  table.columns.add('is_default_visible', sql.Bit, { nullable: false });
  table.columns.add('filterable', sql.Bit, { nullable: false });
  table.columns.add('sortable', sql.Bit, { nullable: false });
  table.columns.add('is_active', sql.Bit, { nullable: false });
  table.columns.add('sort_order', sql.Int, { nullable: false });
  return table;
}

function createTbCacheBulkTable() {
  const table = new sql.Table('dbo.tb_cache');
  table.columns.add('table_id', sql.BigInt, { nullable: false });
  table.columns.add('scope', sql.NVarChar(16), { nullable: false });
  table.columns.add('partition_key', sql.NVarChar(32), { nullable: false });
  table.columns.add('record_key', sql.NVarChar(128), { nullable: false });
  table.columns.add('detail_key', sql.Int, { nullable: false });
  table.columns.add('data_json', sql.NVarChar(sql.MAX), { nullable: false });
  table.columns.add('synced_at', sql.DateTime2, { nullable: false });
  table.columns.add('first_seen_at', sql.DateTime2, { nullable: false });
  table.columns.add('removed_at_source', sql.Bit, { nullable: false });
  return table;
}

async function bulkInsertColumns(tx, tableId, columns) {
  if (!Array.isArray(columns) || !columns.length) return;
  const table = createTbColumnsBulkTable();
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i];
    table.rows.add(
      tableId,
      'master',
      col.key,
      col.label,
      'source',
      col.key,
      col.dataType,
      false,
      true,
      true,
      true,
      true,
      (i + 1) * 10
    );
  }
  await new sql.Request(tx).bulk(table);
}

async function bulkInsertCacheRows(tx, tableId, rows, syncedAt) {
  if (!Array.isArray(rows) || !rows.length) return;
  for (let start = 0; start < rows.length; start += CACHE_BULK_CHUNK_SIZE) {
    const chunk = rows.slice(start, start + CACHE_BULK_CHUNK_SIZE);
    const table = createTbCacheBulkTable();
    for (const row of chunk) {
      table.rows.add(
        tableId,
        'master',
        PARTITION_SENTINEL,
        row.recordKey,
        MASTER_DETAIL_KEY,
        row.dataJson,
        syncedAt,
        syncedAt,
        false
      );
    }
    await new sql.Request(tx).bulk(table);
  }
}

// ---------------------------------------------------------------------------
// Dataset aanmaken/vervangen (upload). Idempotent op de afgeleide tableKey.
// ---------------------------------------------------------------------------
async function getExcelSourceId(pool) {
  const res = await pool.request().query(`SELECT id FROM dbo.tb_sources WHERE [key] = 'excel'`);
  if (!res.recordset.length) throw Object.assign(new Error("Source 'excel' is missing; run migration 017"), { status: 500 });
  return Number(res.recordset[0].id);
}

async function createOrReplaceDataset({ label, fileName, buffer }, userId) {
  const cleanLabel = String(label || fileName || 'Dataset').trim().slice(0, 128) || 'Dataset';
  const { columns, rows } = parseWorkbook(buffer);
  const pool = await getPool();
  const sourceId = await getExcelSourceId(pool);

  const tableKey = `${EXCEL_KEY_PREFIX}${slugify(cleanLabel, crypto.randomBytes(4).toString('hex'))}`.slice(0, 64);

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    // tb_tables upsert (cache_mode='never' -> refresh/isStale slaan de tabel over).
    const existing = await new sql.Request(tx)
      .input('key', sql.NVarChar(64), tableKey)
      .query(`SELECT id FROM dbo.tb_tables WHERE [key] = @key`);
    let tableId;
    // Bij een her-upload: bestaat er al een gepubliceerde koppeling naar deze dataset? Dan herbouwen we
    // record_key op de gekoppelde sleutelkolom, zodat de bestaande fk_join blíjft matchen (AC #162: her-upload
    // behoudt de koppeling). Zonder dit zou record_key terugvallen op synthetische indices en de join stil breken.
    let linkedKeyField = null;
    if (existing.recordset.length) {
      tableId = Number(existing.recordset[0].id);
      const linkRes = await new sql.Request(tx).input('k', sql.NVarChar(64), tableKey)
        .query(`SELECT TOP 1 target_key_field FROM dbo.tb_relations WHERE relation_role = 'lookup' AND target_table_key = @k AND target_key_field IS NOT NULL`);
      linkedKeyField = linkRes.recordset[0]?.target_key_field || null;
      // Vervang de vorige snapshot volledig: cache + kolommen weg (custom-values bestaan niet op excel-tabellen).
      await new sql.Request(tx).input('t', sql.BigInt, tableId).query(`DELETE FROM dbo.tb_cache WHERE table_id = @t`);
      await new sql.Request(tx).input('t', sql.BigInt, tableId).query(`DELETE FROM dbo.tb_columns WHERE table_id = @t`);
      await new sql.Request(tx).input('t', sql.BigInt, tableId)
        .query(`UPDATE dbo.tb_upload_batches SET status = 'replaced' WHERE table_id = @t AND status = 'draft'`);
      await new sql.Request(tx).input('t', sql.BigInt, tableId).input('u', sql.Int, userId || null)
        .input('lbl', sql.NVarChar(128), cleanLabel)
        .query(`UPDATE dbo.tb_tables SET label = @lbl, updated_by = @u, updated_at = SYSUTCDATETIME() WHERE id = @t`);
    } else {
      const ins = await new sql.Request(tx)
        .input('key', sql.NVarChar(64), tableKey)
        .input('label', sql.NVarChar(128), cleanLabel)
        .input('sourceId', sql.BigInt, sourceId)
        .input('u', sql.Int, userId || null)
        .query(`
          INSERT INTO dbo.tb_tables ([key], label, description, source_id, source_entity, key_fields, cache_mode, stale_minutes, max_rows, sort_order, created_by)
          OUTPUT INSERTED.id
          VALUES (@key, @label, 'Excel-upload', @sourceId, 'upload', NULL, 'never', 0, ${MAX_ROWS}, 100, @u)`);
      tableId = Number(ins.recordset[0].id);
    }

    // tb_columns (source='source', scope master). Bulk-insert i.p.v. 1 query per kolom.
    await bulkInsertColumns(tx, tableId, columns);

    // tb_cache (scope master). record_key = synthetische rij-index bij een verse upload; bij een her-upload
    // van een al-gekoppelde dataset direct op de sleutelwaarde (linkedKeyField) zodat de join blijft matchen.
    // partition_key = sentinel (partitie-loos).
    const syncedAt = new Date();
    const seenKeys = new Set();
    let droppedForKey = 0;
    const cacheRows = [];
    for (let i = 0; i < rows.length; i += 1) {
      let recordKey = String(i + 1);
      if (linkedKeyField) {
        const raw = rows[i][linkedKeyField];
        if (raw === null || raw === undefined || raw === '') { droppedForKey += 1; continue; }
        recordKey = String(raw).trim().slice(0, 128);
        if (seenKeys.has(recordKey)) { droppedForKey += 1; continue; } // dubbele sleutel in de nieuwe upload -> overslaan
        seenKeys.add(recordKey);
      }
      cacheRows.push({ recordKey, dataJson: JSON.stringify(rows[i]) });
    }
    await bulkInsertCacheRows(tx, tableId, cacheRows, syncedAt);
    if (linkedKeyField && droppedForKey > 0) {
      logger.warn('Her-upload: rijen overgeslagen wegens lege/dubbele gekoppelde sleutel', { tableKey, linkedKeyField, droppedForKey });
    }

    // tb_sync_state zodat een eventuele /api/data-preview hasCache=true toont (read gebruikt dit niet voor de join).
    await new sql.Request(tx).input('t', sql.BigInt, tableId).input('s', sql.DateTime2, syncedAt).query(`
      MERGE dbo.tb_sync_state AS target USING (SELECT @t AS table_id) AS src ON target.table_id = src.table_id
      WHEN MATCHED THEN UPDATE SET last_full_sync_at = @s, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (table_id, watermark, last_full_sync_at) VALUES (@t, NULL, @s);`);

    await new sql.Request(tx)
      .input('t', sql.BigInt, tableId)
      .input('fn', sql.NVarChar(260), String(fileName || '').slice(0, 260) || null)
      .input('rc', sql.Int, rows.length)
      .input('cc', sql.Int, columns.length)
      .input('u', sql.Int, userId || null)
      .query(`INSERT INTO dbo.tb_upload_batches (table_id, file_name, row_count, column_count, status, uploaded_by)
              VALUES (@t, @fn, @rc, @cc, 'draft', @u)`);

    await tx.commit();
    invalidateTableCache(tableKey);
    logger.info('Excel-dataset opgeslagen', { tableKey, rows: rows.length, columns: columns.length });
    return { tableKey, label: cleanLabel, rowCount: rows.length, columns: columns.map((c) => ({ key: c.key, label: c.label, dataType: c.dataType, samples: c.samples })) };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function listDatasets() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT t.[key], t.label, t.created_at,
           (SELECT COUNT(*) FROM dbo.tb_cache c WHERE c.table_id = t.id AND c.scope = 'master') AS row_count
    FROM dbo.tb_tables t
    INNER JOIN dbo.tb_sources s ON s.id = t.source_id
    WHERE s.[key] = 'excel' AND t.is_active = 1
    ORDER BY t.created_at DESC`);
  const datasets = [];
  for (const r of res.recordset) {
    const cols = await listColumnsForKey(r.key);
    datasets.push({ tableKey: r.key, label: r.label, rowCount: Number(r.row_count), createdAt: r.created_at, columns: cols });
  }
  return { datasets };
}

async function listColumnsForKey(tableKey) {
  const table = await getTableByKey(tableKey);
  const cols = await listColumns({ tableId: table.id, scope: 'master', includeInactive: false });
  // sample-waarden uit de eerste paar cache-rijen.
  const pool = await getPool();
  const sampleRes = await pool.request().input('t', sql.BigInt, table.id)
    .query(`SELECT TOP 3 data_json FROM dbo.tb_cache WHERE table_id = @t AND scope = 'master' ORDER BY record_key`);
  const parsed = sampleRes.recordset.map((r) => { try { return JSON.parse(r.data_json); } catch { return {}; } });
  return cols.map((c) => ({ key: c.key, label: c.label, dataType: c.dataType, samples: parsed.map((p) => p[c.key]).filter((v) => v !== null && v !== undefined && v !== '') }));
}

async function deleteDataset(tableKey) {
  const table = await getTableByKey(tableKey);
  const pool = await getPool();
  const src = await pool.request().input('t', sql.BigInt, table.id)
    .query(`SELECT s.[key] AS source_key FROM dbo.tb_tables t INNER JOIN dbo.tb_sources s ON s.id = t.source_id WHERE t.id = @t`);
  if (src.recordset[0]?.source_key !== 'excel') throw Object.assign(new Error('Only Excel datasets can be deleted'), { status: 400 });

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx).input('k', sql.NVarChar(64), tableKey)
      .query(`DELETE FROM dbo.tb_relations WHERE relation_role = 'lookup' AND target_table_key = @k`);
    await new sql.Request(tx).input('t', sql.BigInt, table.id).query(`DELETE FROM dbo.tb_upload_batches WHERE table_id = @t`);
    await new sql.Request(tx).input('t', sql.BigInt, table.id).query(`DELETE FROM dbo.tb_cache WHERE table_id = @t`);
    await new sql.Request(tx).input('t', sql.BigInt, table.id).query(`DELETE FROM dbo.tb_columns WHERE table_id = @t`);
    await new sql.Request(tx).input('t', sql.BigInt, table.id).query(`DELETE FROM dbo.tb_sync_state WHERE table_id = @t`);
    await new sql.Request(tx).input('t', sql.BigInt, table.id).query(`DELETE FROM dbo.tb_tables WHERE id = @t`);
    await tx.commit();
    // Relaties naar deze dataset zijn mee verwijderd; hele metadata-cache leegmaken.
    invalidateTableCache();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Kandidaat-hoofdtabellen (alle niet-excel tb_tables) + hun kolommen voor sleutel/scope-keuze.
// ---------------------------------------------------------------------------
async function listMainTables() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT t.id, t.[key], t.label
    FROM dbo.tb_tables t
    INNER JOIN dbo.tb_sources s ON s.id = t.source_id
    WHERE s.[key] <> 'excel' AND t.is_active = 1
    ORDER BY t.sort_order, t.label`);
  const tables = [];
  for (const r of res.recordset) {
    const [master, detail] = await Promise.all([
      listColumns({ tableId: Number(r.id), scope: 'master', includeInactive: false }),
      listColumns({ tableId: Number(r.id), scope: 'detail', includeInactive: false }),
    ]);
    tables.push({
      tableKey: r.key,
      label: r.label,
      columns: {
        master: master.filter((c) => c.source !== 'lookup').map((c) => ({ key: c.key, label: c.label })),
        detail: detail.filter((c) => c.source !== 'lookup').map((c) => ({ key: c.key, label: c.label })),
      },
    });
  }
  return { tables };
}

// ---------------------------------------------------------------------------
// Validatie: duplicaten aan datasetzijde + match-rate tegen de hoofdtabel. Geen writes.
// ---------------------------------------------------------------------------
async function computeStats({ datasetTableKey, datasetKeyField, mainTableKey, sourceScope, mainKeyField }) {
  const datasetTable = await getTableByKey(datasetTableKey);
  const mainTable = await getTableByKey(mainTableKey);
  const pool = await getPool();

  const dsRes = await pool.request().input('t', sql.BigInt, datasetTable.id)
    .query(`SELECT data_json FROM dbo.tb_cache WHERE table_id = @t AND scope = 'master'`);
  const keyCounts = new Map();
  for (const r of dsRes.recordset) {
    let v = null;
    try { v = JSON.parse(r.data_json)[datasetKeyField]; } catch { v = null; }
    if (v === null || v === undefined || v === '') continue;
    const k = String(v).trim();
    keyCounts.set(k, (keyCounts.get(k) || 0) + 1);
  }
  const duplicateExamples = [];
  let duplicateCount = 0;
  for (const [k, n] of keyCounts) {
    if (n > 1) { duplicateCount += 1; if (duplicateExamples.length < 10) duplicateExamples.push({ value: k, count: n }); }
  }
  const datasetKeys = new Set(keyCounts.keys());

  const scope = sourceScope === 'detail' ? 'detail' : 'master';
  const mainRes = await pool.request().input('t', sql.BigInt, mainTable.id).input('s', sql.NVarChar(16), scope)
    .query(`SELECT data_json FROM dbo.tb_cache WHERE table_id = @t AND scope = @s AND removed_at_source = 0`);
  let total = 0; let matched = 0;
  for (const r of mainRes.recordset) {
    let v = null;
    try { v = JSON.parse(r.data_json)[mainKeyField]; } catch { v = null; }
    if (v === null || v === undefined || v === '') continue;
    total += 1;
    if (datasetKeys.has(String(v).trim())) matched += 1;
  }
  const rate = total > 0 ? matched / total : 0;
  return {
    ok: duplicateCount === 0,
    duplicates: { count: duplicateCount, examples: duplicateExamples },
    matchRate: { matched, total, rate },
  };
}

async function validateLink(params) {
  return computeStats(params);
}

// ---------------------------------------------------------------------------
// Publiceren: herschrijf de dataset-cache met record_key = sleutelwaarde (uniek), en leg de lookup-relatie.
// ---------------------------------------------------------------------------
async function publishLink({ mainTableKey, datasetTableKey, sourceScope, mainKeyField, datasetKeyField, fields }) {
  if (!mainTableKey || !datasetTableKey || !mainKeyField || !datasetKeyField) {
    throw Object.assign(new Error('mainTableKey, datasetTableKey, mainKeyField and datasetKeyField are required'), { status: 400 });
  }
  const fieldMap = fields && typeof fields === 'object' ? fields : {};
  if (!Object.keys(fieldMap).length) throw Object.assign(new Error('Select at least one column to display'), { status: 400 });

  const stats = await computeStats({ datasetTableKey, datasetKeyField, mainTableKey, sourceScope, mainKeyField });
  if (!stats.ok) {
    throw Object.assign(new Error(`Publishing blocked: ${stats.duplicates.count} duplicate key value(s) in the dataset`), { status: 400, details: stats.duplicates });
  }

  const datasetTable = await getTableByKey(datasetTableKey);
  const mainTable = await getTableByKey(mainTableKey);
  const scope = sourceScope === 'detail' ? 'detail' : 'master';
  const pool = await getPool();

  // Herschrijf record_key = genormaliseerde sleutelwaarde. Rijen zonder sleutelwaarde vervallen voor de join.
  const rowsRes = await pool.request().input('t', sql.BigInt, datasetTable.id)
    .query(`SELECT record_key, data_json FROM dbo.tb_cache WHERE table_id = @t AND scope = 'master'`);

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx).input('t', sql.BigInt, datasetTable.id)
      .query(`DELETE FROM dbo.tb_cache WHERE table_id = @t AND scope = 'master'`);
    const syncedAt = new Date();
    const seen = new Set();
    const cacheRows = [];
    for (const r of rowsRes.recordset) {
      let json; try { json = JSON.parse(r.data_json); } catch { json = {}; }
      const raw = json[datasetKeyField];
      if (raw === null || raw === undefined || raw === '') continue;
      const key = String(raw).trim().slice(0, 128);
      if (seen.has(key)) continue; // defensief; computeStats gaf ok=true
      seen.add(key);
      cacheRows.push({ recordKey: key, dataJson: r.data_json });
    }
    await bulkInsertCacheRows(tx, datasetTable.id, cacheRows, syncedAt);

    // Upsert de lookup-relatie (idempotent op main+target).
    const relRes = await new sql.Request(tx)
      .input('tableId', sql.BigInt, mainTable.id)
      .input('scope', sql.NVarChar(16), scope)
      .input('sourceField', sql.NVarChar(128), mainKeyField)
      .input('targetKey', sql.NVarChar(64), datasetTableKey)
      .input('targetKeyField', sql.NVarChar(128), datasetKeyField)
      .input('fieldsJson', sql.NVarChar(sql.MAX), JSON.stringify(fieldMap))
      .query(`
        MERGE dbo.tb_relations AS target
        USING (SELECT @tableId AS table_id, @targetKey AS target_table_key) AS src
          ON target.table_id = src.table_id AND target.relation_role = 'lookup' AND target.target_table_key = src.target_table_key
        WHEN MATCHED THEN UPDATE SET
          source_scope = @scope, source_field = @sourceField, target_key_field = @targetKeyField, lookup_fields_json = @fieldsJson, relation_kind = 'fk_join'
        WHEN NOT MATCHED THEN INSERT (table_id, relation_kind, relation_role, source_scope, source_field, target_table_key, target_key_field, lookup_fields_json)
          VALUES (@tableId, 'fk_join', 'lookup', @scope, @sourceField, @targetKey, @targetKeyField, @fieldsJson)
        OUTPUT INSERTED.id;`);

    await new sql.Request(tx).input('t', sql.BigInt, datasetTable.id).input('kf', sql.NVarChar(128), datasetKeyField)
      .query(`UPDATE dbo.tb_upload_batches SET status = 'published', key_field = @kf WHERE table_id = @t AND status = 'draft'`);

    await tx.commit();
    // tb_relations is onderdeel van de gecachte tabel-metadata van de hoofdtabel.
    invalidateTableCache();
    const relationId = relRes.recordset[0] ? Number(relRes.recordset[0].id) : null;
    logger.info('Excel-koppeling gepubliceerd', { mainTableKey, datasetTableKey, matched: stats.matchRate.matched });
    return { published: true, relationId, matchRate: stats.matchRate };
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Bestaande excel-lookups (koppelingen naar een excel-dataset).
// ---------------------------------------------------------------------------
async function listLinks() {
  const pool = await getPool();
  const res = await pool.request().query(`
    SELECT r.id, mt.[key] AS main_table_key, mt.label AS main_label, r.target_table_key, dt.label AS dataset_label,
           r.source_scope, r.source_field, r.target_key_field, r.lookup_fields_json
    FROM dbo.tb_relations r
    INNER JOIN dbo.tb_tables mt ON mt.id = r.table_id
    LEFT JOIN dbo.tb_tables dt ON dt.[key] = r.target_table_key
    LEFT JOIN dbo.tb_sources ds ON ds.id = dt.source_id
    WHERE r.relation_role = 'lookup' AND ds.[key] = 'excel'
    ORDER BY r.id DESC`);
  const links = res.recordset.map((r) => {
    let fields = {}; try { fields = r.lookup_fields_json ? JSON.parse(r.lookup_fields_json) : {}; } catch { fields = {}; }
    return {
      id: Number(r.id),
      mainTableKey: r.main_table_key,
      mainLabel: r.main_label,
      datasetTableKey: r.target_table_key,
      datasetLabel: r.dataset_label,
      sourceScope: r.source_scope,
      sourceField: r.source_field,
      datasetKeyField: r.target_key_field,
      fields,
    };
  });
  return { links };
}

async function deleteLink(relationId) {
  const id = Number.parseInt(relationId, 10);
  if (!Number.isFinite(id) || id <= 0) throw Object.assign(new Error('Invalid id'), { status: 400 });
  const pool = await getPool();
  await pool.request().input('id', sql.BigInt, id)
    .query(`DELETE FROM dbo.tb_relations WHERE id = @id AND relation_role = 'lookup'`);
  invalidateTableCache();
  return { success: true };
}

module.exports = {
  parseWorkbook,
  createOrReplaceDataset,
  listDatasets,
  deleteDataset,
  listMainTables,
  validateLink,
  publishLink,
  listLinks,
  deleteLink,
  MAX_ROWS,
};
