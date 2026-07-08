'use strict';

// Eigen express-session store op MSSQL, gebouwd op de gedeelde app-pool (sql.connect).
// Vervangt connect-mssql-v2 (#session-store-hang): die had een eigen, los beheerde pool met een
// race in zijn handgeschreven ready() — bij meerdere parallelle requests vlak na login miste de
// '.once(connect)'-listener het connect-event, waardoor elke store.get bleef hangen (alleen in de
// container, waar de SPA meerdere calls tegelijk doet). Door dezelfde, bewezen werkende pool te
// gebruiken als de routes/services, verdwijnt die hele klasse problemen.
//
// Tabel: dbo.sessions (sid NVARCHAR(255) PK, session NVARCHAR(MAX), expires DATETIME2) — migratie 001.

const session = require('express-session');
const sql = require('mssql');
const { getSqlPool } = require('../utils/sqlPool');

const DEFAULT_TABLE = 'sessions';

class SqlSessionStore extends session.Store {
  constructor({ table = DEFAULT_TABLE, ttlMs } = {}) {
    super();
    // Alleen [A-Za-z0-9_] toestaan: de tabelnaam wordt geïnterpoleerd, dus nooit user-input.
    this.table = /^[A-Za-z0-9_]+$/.test(table) ? table : DEFAULT_TABLE;
    this.ttlMs = Number.isFinite(ttlMs) && ttlMs > 0
      ? ttlMs
      : parseInt(process.env.SESSION_TTL_HOURS || '8', 10) * 60 * 60 * 1000;
  }

  getPool() {
    return getSqlPool();
  }

  resolveExpiry(sess) {
    const raw = sess && sess.cookie ? sess.cookie.expires : null;
    if (raw && typeof raw !== 'boolean') {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date(Date.now() + this.ttlMs);
  }

  async get(sid, callback) {
    try {
      const pool = await this.getPool();
      const result = await pool.request()
        .input('sid', sql.NVarChar(255), sid)
        .query(`SELECT session FROM dbo.${this.table} WHERE sid = @sid AND expires > SYSUTCDATETIME()`);
      if (!result.recordset.length) return callback(null, null);
      let parsed = null;
      try {
        parsed = JSON.parse(result.recordset[0].session);
      } catch (parseErr) {
        return callback(parseErr);
      }
      return callback(null, parsed);
    } catch (err) {
      return callback(err);
    }
  }

  async set(sid, sess, callback) {
    try {
      const pool = await this.getPool();
      await pool.request()
        .input('sid', sql.NVarChar(255), sid)
        .input('session', sql.NVarChar(sql.MAX), JSON.stringify(sess))
        .input('expires', sql.DateTime2, this.resolveExpiry(sess))
        .query(`
          MERGE dbo.${this.table} AS target
          USING (SELECT @sid AS sid) AS src ON target.sid = src.sid
          WHEN MATCHED THEN UPDATE SET session = @session, expires = @expires
          WHEN NOT MATCHED THEN INSERT (sid, session, expires) VALUES (@sid, @session, @expires);
        `);
      return callback ? callback(null) : undefined;
    } catch (err) {
      return callback ? callback(err) : undefined;
    }
  }

  async touch(sid, sess, callback) {
    try {
      const pool = await this.getPool();
      await pool.request()
        .input('sid', sql.NVarChar(255), sid)
        .input('expires', sql.DateTime2, this.resolveExpiry(sess))
        .query(`UPDATE dbo.${this.table} SET expires = @expires WHERE sid = @sid`);
      return callback ? callback(null) : undefined;
    } catch (err) {
      return callback ? callback(err) : undefined;
    }
  }

  async destroy(sid, callback) {
    try {
      const pool = await this.getPool();
      await pool.request()
        .input('sid', sql.NVarChar(255), sid)
        .query(`DELETE FROM dbo.${this.table} WHERE sid = @sid`);
      return callback ? callback(null) : undefined;
    } catch (err) {
      return callback ? callback(err) : undefined;
    }
  }
}

module.exports = SqlSessionStore;
