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

// express-session roept touch() op elke request aan (resave:false) om de expiry te verlengen; dat
// is een SQL-UPDATE die de response blokkeert (~1 remote round-trip per request). Met een TTL van
// uren volstaat het de expiry hooguit eens per interval echt weg te schrijven; tussentijdse touches
// zijn no-ops. Worst case verloopt een sessie dit interval eerder — verwaarloosbaar op 8 uur TTL.
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

// Korte read-cache voor sessies: elke API-request begint met een store.get (~1 remote SQL-round-trip,
// gemeten ~85ms) terwijl sessiedata na login niet meer wijzigt. We cachen de geserialiseerde sessie
// kort in-memory; set/destroy werken de cache direct bij. De JSON wordt per get opnieuw geparsed
// zodat requests nooit hetzelfde mutable object delen. Trade-off: een op een ándere replica
// vernietigde sessie kan hier maximaal deze TTL nawerken — de cookie is client-side dan al gewist.
const SESSION_CACHE_TTL_MS = 30 * 1000;
const SESSION_CACHE_MAX_ENTRIES = 5000;

class SqlSessionStore extends session.Store {
  constructor({ table = DEFAULT_TABLE, ttlMs } = {}) {
    super();
    // Alleen [A-Za-z0-9_] toestaan: de tabelnaam wordt geïnterpoleerd, dus nooit user-input.
    this.table = /^[A-Za-z0-9_]+$/.test(table) ? table : DEFAULT_TABLE;
    this.ttlMs = Number.isFinite(ttlMs) && ttlMs > 0
      ? ttlMs
      : parseInt(process.env.SESSION_TTL_HOURS || '8', 10) * 60 * 60 * 1000;
    // sid -> timestamp van laatste weggeschreven touch (in-memory; per replica).
    this.lastTouchAt = new Map();
    // sid -> { json, expiresAt } — korte read-cache (zie SESSION_CACHE_TTL_MS hierboven).
    this.sessionCache = new Map();
  }

  cacheSession(sid, json) {
    if (this.sessionCache.size >= SESSION_CACHE_MAX_ENTRIES) {
      const now = Date.now();
      for (const [key, entry] of this.sessionCache) {
        if (entry.expiresAt <= now) this.sessionCache.delete(key);
      }
      // Cache vol met verse entries: sla nieuwe entry over i.p.v. onbegrensd groeien.
      if (this.sessionCache.size >= SESSION_CACHE_MAX_ENTRIES) return;
    }
    this.sessionCache.set(sid, { json, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
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
      const cached = this.sessionCache.get(sid);
      if (cached && cached.expiresAt > Date.now()) {
        return callback(null, JSON.parse(cached.json));
      }
      const pool = await this.getPool();
      const result = await pool.request()
        .input('sid', sql.NVarChar(255), sid)
        .query(`SELECT session FROM dbo.${this.table} WHERE sid = @sid AND expires > SYSUTCDATETIME()`);
      if (!result.recordset.length) {
        this.sessionCache.delete(sid);
        return callback(null, null);
      }
      const json = result.recordset[0].session;
      let parsed = null;
      try {
        parsed = JSON.parse(json);
      } catch (parseErr) {
        return callback(parseErr);
      }
      this.cacheSession(sid, json);
      return callback(null, parsed);
    } catch (err) {
      return callback(err);
    }
  }

  async set(sid, sess, callback) {
    try {
      const pool = await this.getPool();
      const json = JSON.stringify(sess);
      await pool.request()
        .input('sid', sql.NVarChar(255), sid)
        .input('session', sql.NVarChar(sql.MAX), json)
        .input('expires', sql.DateTime2, this.resolveExpiry(sess))
        .query(`
          MERGE dbo.${this.table} AS target
          USING (SELECT @sid AS sid) AS src ON target.sid = src.sid
          WHEN MATCHED THEN UPDATE SET session = @session, expires = @expires
          WHEN NOT MATCHED THEN INSERT (sid, session, expires) VALUES (@sid, @session, @expires);
        `);
      this.cacheSession(sid, json);
      return callback ? callback(null) : undefined;
    } catch (err) {
      return callback ? callback(err) : undefined;
    }
  }

  async touch(sid, sess, callback) {
    try {
      const now = Date.now();
      const last = this.lastTouchAt.get(sid) || 0;
      if (now - last < TOUCH_INTERVAL_MS) {
        return callback ? callback(null) : undefined;
      }
      const pool = await this.getPool();
      await pool.request()
        .input('sid', sql.NVarChar(255), sid)
        .input('expires', sql.DateTime2, this.resolveExpiry(sess))
        .query(`UPDATE dbo.${this.table} SET expires = @expires WHERE sid = @sid`);
      this.lastTouchAt.set(sid, now);
      // Begrensd houden: bij veel verschillende sids oude entries opruimen.
      if (this.lastTouchAt.size > 10000) {
        for (const [key, at] of this.lastTouchAt) {
          if (now - at >= TOUCH_INTERVAL_MS) this.lastTouchAt.delete(key);
        }
      }
      return callback ? callback(null) : undefined;
    } catch (err) {
      return callback ? callback(err) : undefined;
    }
  }

  async destroy(sid, callback) {
    try {
      this.lastTouchAt.delete(sid);
      this.sessionCache.delete(sid);
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
