'use strict';

const sql = require('mssql');
const { getSqlPool } = require('../utils/sqlPool');

function getPool() {
  return getSqlPool();
}

function mapRow(row) {
  return {
    id: row.id,
    vendorAccount: row.vendor_account,
    periodYear: row.period_year,
    isoWeek: row.iso_week,
    capacityCategory: row.capacity_category,
    availableQty: Number(row.available_qty),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

async function listCapacity({ vendorAccount = null, periodYear = null, fromWeek = null, toWeek = null } = {}) {
  const pool = await getPool();
  const request = pool.request();
  let query = `
    SELECT id, vendor_account, period_year, iso_week, capacity_category, available_qty,
           created_at, updated_at, updated_by
    FROM dbo.rccp_capacity
    WHERE 1=1
  `;
  if (vendorAccount) {
    request.input('vendorAccount', sql.NVarChar(64), vendorAccount);
    query += ' AND vendor_account = @vendorAccount';
  }
  if (periodYear !== null && periodYear !== undefined) {
    request.input('periodYear', sql.Int, periodYear);
    query += ' AND period_year = @periodYear';
  }
  if (fromWeek !== null && toWeek !== null) {
    request.input('fromWeek', sql.Int, fromWeek);
    request.input('toWeek', sql.Int, toWeek);
    query += ' AND iso_week BETWEEN @fromWeek AND @toWeek';
  }
  query += ' ORDER BY vendor_account, period_year, iso_week, capacity_category';
  const result = await request.query(query);
  return result.recordset.map(mapRow);
}

async function createCapacity(payload, userId = null) {
  const pool = await getPool();
  try {
    const result = await pool.request()
      .input('vendorAccount', sql.NVarChar(64), payload.vendorAccount)
      .input('periodYear', sql.Int, payload.periodYear)
      .input('isoWeek', sql.Int, payload.isoWeek)
      .input('capacityCategory', sql.NVarChar(128), payload.capacityCategory)
      .input('availableQty', sql.Decimal(18, 4), payload.availableQty)
      .input('userId', sql.Int, userId)
      .query(`
        INSERT INTO dbo.rccp_capacity
          (vendor_account, period_year, iso_week, capacity_category, available_qty, updated_by)
        OUTPUT INSERTED.*
        VALUES (@vendorAccount, @periodYear, @isoWeek, @capacityCategory, @availableQty, @userId)
      `);
    return mapRow(result.recordset[0]);
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      const dup = new Error('Capacity record already exists for this vendor, week and category');
      dup.status = 409;
      throw dup;
    }
    throw err;
  }
}

async function updateCapacity(id, payload, userId = null) {
  const pool = await getPool();
  try {
    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .input('vendorAccount', sql.NVarChar(64), payload.vendorAccount)
      .input('periodYear', sql.Int, payload.periodYear)
      .input('isoWeek', sql.Int, payload.isoWeek)
      .input('capacityCategory', sql.NVarChar(128), payload.capacityCategory)
      .input('availableQty', sql.Decimal(18, 4), payload.availableQty)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE dbo.rccp_capacity
        SET vendor_account = @vendorAccount,
            period_year = @periodYear,
            iso_week = @isoWeek,
            capacity_category = @capacityCategory,
            available_qty = @availableQty,
            updated_at = SYSUTCDATETIME(),
            updated_by = @userId
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    if (!result.recordset.length) {
      const err = new Error('Capacity record not found');
      err.status = 404;
      throw err;
    }
    return mapRow(result.recordset[0]);
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      const dup = new Error('Capacity record already exists for this vendor, week and category');
      dup.status = 409;
      throw dup;
    }
    throw err;
  }
}

async function upsertCapacity(payload, userId = null) {
  const pool = await getPool();
  const result = await pool.request()
    .input('vendorAccount', sql.NVarChar(64), payload.vendorAccount)
    .input('periodYear', sql.Int, payload.periodYear)
    .input('isoWeek', sql.Int, payload.isoWeek)
    .input('capacityCategory', sql.NVarChar(128), payload.capacityCategory)
    .input('availableQty', sql.Decimal(18, 4), payload.availableQty)
    .input('userId', sql.Int, userId)
    .query(`
      MERGE dbo.rccp_capacity AS target
      USING (SELECT @vendorAccount AS vendor_account, @periodYear AS period_year,
                    @isoWeek AS iso_week, @capacityCategory AS capacity_category) AS source
        ON target.vendor_account = source.vendor_account
       AND target.period_year = source.period_year
       AND target.iso_week = source.iso_week
       AND target.capacity_category = source.capacity_category
      WHEN MATCHED THEN
        UPDATE SET available_qty = @availableQty, updated_at = SYSUTCDATETIME(), updated_by = @userId
      WHEN NOT MATCHED THEN
        INSERT (vendor_account, period_year, iso_week, capacity_category, available_qty, updated_by)
        VALUES (@vendorAccount, @periodYear, @isoWeek, @capacityCategory, @availableQty, @userId)
      OUTPUT INSERTED.*;
    `);
  return mapRow(result.recordset[0]);
}

async function deleteCapacity(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.BigInt, id)
    .query('DELETE FROM dbo.rccp_capacity OUTPUT DELETED.id WHERE id = @id');
  if (!result.recordset.length) {
    const err = new Error('Capacity record not found');
    err.status = 404;
    throw err;
  }
  return { id: result.recordset[0].id };
}

async function deleteAllCapacity({ vendorAccount = null } = {}) {
  const pool = await getPool();
  const request = pool.request();
  let query = 'DELETE FROM dbo.rccp_capacity OUTPUT DELETED.id WHERE 1=1';
  if (vendorAccount) {
    request.input('vendorAccount', sql.NVarChar(64), vendorAccount);
    query += ' AND vendor_account = @vendorAccount';
  }
  const result = await request.query(query);
  return { deletedCount: result.recordset.length };
}

// Verwijdert een geselecteerde set rijen in één round-trip (i.p.v. één DELETE per rij vanuit de
// client) — gebruikt door de "verwijder geselecteerde" actie in de capacity-planning-grid.
async function deleteCapacityRows(ids) {
  const validIds = (Array.isArray(ids) ? ids : [])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (!validIds.length) return { deletedCount: 0 };

  const pool = await getPool();
  const request = pool.request();
  const placeholders = validIds.map((id, index) => {
    const paramName = `id${index}`;
    request.input(paramName, sql.BigInt, id);
    return `@${paramName}`;
  });
  const result = await request.query(
    `DELETE FROM dbo.rccp_capacity OUTPUT DELETED.id WHERE id IN (${placeholders.join(', ')})`
  );
  return { deletedCount: result.recordset.length };
}

module.exports = {
  listCapacity,
  createCapacity,
  updateCapacity,
  upsertCapacity,
  deleteCapacity,
  deleteAllCapacity,
  deleteCapacityRows,
};
