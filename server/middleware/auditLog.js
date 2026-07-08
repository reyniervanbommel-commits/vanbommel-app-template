'use strict';

const sql = require('mssql');
const { getSqlPool } = require('../utils/sqlPool');

async function auditLog(userId, userEmail, action, tableName, recordId, payload) {
  try {
    const pool = await getSqlPool();
    await pool.request()
      .input('userId', sql.Int, userId || null)
      .input('userEmail', sql.NVarChar, userEmail || null)
      .input('action', sql.NVarChar, action)
      .input('tableName', sql.NVarChar, tableName || null)
      .input('recordId', sql.NVarChar, recordId ? String(recordId) : null)
      .input('payload', sql.NVarChar, payload ? JSON.stringify(payload) : null)
      .query('INSERT INTO dbo.audit_log (user_id, user_email, action, table_name, record_id, payload) VALUES (@userId, @userEmail, @action, @tableName, @recordId, @payload)');
  } catch (err) {
    console.error('[auditLog] Error:', err.message);
  }
}

module.exports = { auditLog };
