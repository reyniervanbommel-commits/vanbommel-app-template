'use strict';

/**
 * SettingsService — leest en schrijft app-instellingen via dbo.app_settings.
 * Houdt een in-memory cache bij; env vars fungeren als fallback.
 */

const sql = require('mssql');

const _cache = new Map();
let _initialized = false;
let _initPromise = null;

function getPool() {
  return sql.connect(process.env.SQL_CONNECTION_STRING);
}

async function _loadFromDb() {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT setting_key, setting_value FROM dbo.app_settings');
    for (const row of result.recordset) {
      _cache.set(row.setting_key, row.setting_value ?? '');
    }
    _initialized = true;
  } catch {
    // DB niet beschikbaar — env vars als fallback, niet als fout beschouwen
    _initialized = true;
  }
}

async function init() {
  if (_initialized) return;
  if (!_initPromise) {
    _initPromise = _loadFromDb();
  }
  await _initPromise;
}

/**
 * Geeft waarde op uit cache, daarna env var, daarna fallback.
 * Roep init() aan voor gebruik (of gebruik getAsync).
 */
function get(key, fallback = '') {
  if (_cache.has(key)) return _cache.get(key);
  return process.env[key] ?? fallback;
}

async function getAsync(key, fallback = '') {
  await init();
  return get(key, fallback);
}

async function set(key, value, userId = null) {
  await init();
  const pool = await getPool();
  await pool.request()
    .input('key', sql.NVarChar(100), key)
    .input('value', sql.NVarChar(sql.MAX), value ?? '')
    .input('userId', sql.Int, userId)
    .query(`
      MERGE dbo.app_settings AS target
      USING (SELECT @key AS setting_key) AS source ON target.setting_key = source.setting_key
      WHEN MATCHED THEN
        UPDATE SET setting_value = @value, updated_at = SYSUTCDATETIME(), updated_by = @userId
      WHEN NOT MATCHED THEN
        INSERT (setting_key, setting_value, updated_at, updated_by)
        VALUES (@key, @value, SYSUTCDATETIME(), @userId);
    `);
  _cache.set(key, value ?? '');
}

const ODATA_KEYS = [
  'D365_ODATA_BASE_URL',
  'D365_ODATA_PURCHASE_ORDERS_PATH',
  'D365_ODATA_COMPANY',
  'D365_ODATA_BEARER_TOKEN',
  'D365_ODATA_TIMEOUT_MS',
];

async function getODataConfig() {
  await init();
  return Object.fromEntries(ODATA_KEYS.map((k) => [k, get(k)]));
}

async function saveODataConfig(settings, userId = null) {
  for (const key of ODATA_KEYS) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      await set(key, settings[key], userId);
    }
  }
}

module.exports = { init, get, getAsync, set, getODataConfig, saveODataConfig, ODATA_KEYS };
