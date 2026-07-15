'use strict';

const XLSX = require('xlsx');
const sql = require('mssql');
const { getSqlPool } = require('../utils/sqlPool');
const capacityService = require('./RccpCapacityService');

const CANONICAL_HEADERS = Object.freeze([
  'VendorCode',
  'Year',
  'ISOWeek',
  'CapacityCategory',
  'CapacityQuantity',
]);

function getPool() {
  return getSqlPool();
}

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows: [], errors: ['Workbook has no sheets'] };
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (!matrix.length) return { rows: [], errors: ['Sheet is empty'] };

  const headerRow = matrix[0].map((h) => normalizeHeader(h));
  const expected = CANONICAL_HEADERS.map((h) => normalizeHeader(h));
  const indexByField = {};
  expected.forEach((key, idx) => {
    const colIdx = headerRow.indexOf(key);
    if (colIdx >= 0) indexByField[CANONICAL_HEADERS[idx]] = colIdx;
  });
  const missing = CANONICAL_HEADERS.filter((h) => indexByField[h] === undefined);
  if (missing.length) {
    return { rows: [], errors: [`Missing columns: ${missing.join(', ')}`] };
  }

  const rows = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const line = matrix[i];
    if (!line || line.every((c) => c === null || c === '')) continue;
    rows.push({
      rowNumber: i + 1,
      vendorAccount: String(line[indexByField.VendorCode] ?? '').trim(),
      periodYear: Number(line[indexByField.Year]),
      isoWeek: Number(line[indexByField.ISOWeek]),
      capacityCategory: String(line[indexByField.CapacityCategory] ?? '').trim(),
      availableQty: Number(String(line[indexByField.CapacityQuantity] ?? '').replace(',', '.')),
    });
  }
  return { rows, errors: [] };
}

function validateImportRow(row) {
  const errors = [];
  if (!row.vendorAccount) errors.push('VendorCode is required');
  if (!Number.isInteger(row.periodYear) || row.periodYear < 2000 || row.periodYear > 2100) {
    errors.push('Year must be a valid integer');
  }
  if (!Number.isInteger(row.isoWeek) || row.isoWeek < 1 || row.isoWeek > 53) {
    errors.push('ISOWeek must be between 1 and 53');
  }
  if (!row.capacityCategory) errors.push('CapacityCategory is required');
  if (!Number.isFinite(row.availableQty) || row.availableQty < 0) {
    errors.push('CapacityQuantity must be a non-negative number');
  }
  return errors;
}

async function findExistingKeys(rows) {
  if (!rows.length) return new Set();
  const pool = await getPool();
  const keys = rows.map((r) => `${r.vendorAccount}|${r.periodYear}|${r.isoWeek}|${r.capacityCategory}`);
  const unique = [...new Set(keys)];
  const existing = new Set();
  for (const chunk of unique) {
    const [vendorAccount, periodYear, isoWeek, capacityCategory] = chunk.split('|');
    const result = await pool.request()
      .input('vendorAccount', sql.NVarChar(64), vendorAccount)
      .input('periodYear', sql.Int, Number(periodYear))
      .input('isoWeek', sql.Int, Number(isoWeek))
      .input('capacityCategory', sql.NVarChar(128), capacityCategory)
      .query(`
        SELECT 1 AS hit FROM dbo.rccp_capacity
        WHERE vendor_account = @vendorAccount AND period_year = @periodYear
          AND iso_week = @isoWeek AND capacity_category = @capacityCategory
      `);
    if (result.recordset.length) existing.add(chunk);
  }
  return existing;
}

async function previewImport(buffer) {
  const parsed = parseWorkbook(buffer);
  if (parsed.errors.length) return { valid: [], invalid: [], duplicates: [], errors: parsed.errors };

  const existingKeys = await findExistingKeys(parsed.rows.filter((r) => !validateImportRow(r).length));
  const valid = [];
  const invalid = [];
  const duplicates = [];

  for (const row of parsed.rows) {
    const rowErrors = validateImportRow(row);
    if (rowErrors.length) {
      invalid.push({ ...row, errors: rowErrors });
      continue;
    }
    const key = `${row.vendorAccount}|${row.periodYear}|${row.isoWeek}|${row.capacityCategory}`;
    if (existingKeys.has(key)) {
      duplicates.push({ ...row, key });
    } else {
      valid.push(row);
    }
  }

  return { valid, invalid, duplicates, errors: [] };
}

async function commitImport({ buffer, fileName, duplicatePolicy, userId }) {
  const preview = await previewImport(buffer);
  if (preview.errors.length) {
    const err = new Error(preview.errors.join('; '));
    err.status = 400;
    throw err;
  }

  const toApply = [...preview.valid];
  if (duplicatePolicy === 'update') {
    toApply.push(...preview.duplicates);
  }

  const applied = [];
  for (const row of toApply) {
    const saved = await capacityService.upsertCapacity({
      vendorAccount: row.vendorAccount,
      periodYear: row.periodYear,
      isoWeek: row.isoWeek,
      capacityCategory: row.capacityCategory,
      availableQty: row.availableQty,
    }, userId);
    applied.push(saved);
  }

  const pool = await getPool();
  const batchResult = await pool.request()
    .input('fileName', sql.NVarChar(256), fileName || null)
    .input('importedBy', sql.Int, userId)
    .input('totalRows', sql.Int, preview.valid.length + preview.invalid.length + preview.duplicates.length)
    .input('validRows', sql.Int, applied.length)
    .input('errorRows', sql.Int, preview.invalid.length)
    .input('duplicateRows', sql.Int, preview.duplicates.length)
    .input('summary', sql.NVarChar(sql.MAX), JSON.stringify({
      skippedDuplicates: duplicatePolicy === 'skip' ? preview.duplicates.length : 0,
    }))
    .query(`
      INSERT INTO dbo.rccp_import_batches
        (file_name, imported_by, total_rows, valid_rows, error_rows, duplicate_rows, summary)
      OUTPUT INSERTED.*
      VALUES (@fileName, @importedBy, @totalRows, @validRows, @errorRows, @duplicateRows, @summary)
    `);

  return {
    batch: batchResult.recordset[0],
    appliedCount: applied.length,
    invalid: preview.invalid,
    skippedDuplicates: duplicatePolicy === 'skip' ? preview.duplicates : [],
  };
}

function buildTemplateWorkbook() {
  const ws = XLSX.utils.aoa_to_sheet([CANONICAL_HEADERS]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RCCP Capacity');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  CANONICAL_HEADERS,
  parseWorkbook,
  validateImportRow,
  previewImport,
  commitImport,
  buildTemplateWorkbook,
};
