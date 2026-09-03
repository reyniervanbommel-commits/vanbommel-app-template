'use strict';

/**
 * PO-tabelzoom per gebruiker in dbo.user_board_settings.
 * Ontbrekende persoonlijke waarde valt terug op de legacy globale app_settings-key.
 */

const sql = require('mssql');
const settingsService = require('./SettingsService');
const sqlPool = require('../utils/sqlPool');

const PO_TABLE_ZOOM_KEY = 'PO_TABLE_ZOOM';
const PO_TABLE_ZOOM_BOARD_KEY = 'po-table-zoom';
const PO_TABLE_ZOOM_DEFAULT = 0.85;
const PO_TABLE_ZOOM_MIN = 0.75;
const PO_TABLE_ZOOM_MAX = 1.1;

function clampPoTableZoom(value) {
  return Math.min(PO_TABLE_ZOOM_MAX, Math.max(PO_TABLE_ZOOM_MIN, value));
}

function parsePoTableZoom(raw) {
  const parsed = Number(raw);
  const base = Number.isFinite(parsed) ? parsed : PO_TABLE_ZOOM_DEFAULT;
  return clampPoTableZoom(base);
}

function zoomFromSettingsJson(rawJson) {
  try {
    const parsed = JSON.parse(rawJson || '{}');
    if (parsed && parsed.poTableZoom != null) return parsePoTableZoom(parsed.poTableZoom);
  } catch {
    /* ongeldige JSON — behandel als geen persoonlijke waarde */
  }
  return null;
}

async function readPersonalZoom(userId) {
  if (!userId) return null;
  const pool = await sqlPool.getSqlPool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .input('boardKey', sql.NVarChar(64), PO_TABLE_ZOOM_BOARD_KEY)
    .query(`
      SELECT settings_json
      FROM dbo.user_board_settings
      WHERE user_id = @userId AND board_key = @boardKey
    `);
  if (!result.recordset.length) return null;
  return zoomFromSettingsJson(result.recordset[0].settings_json);
}

async function readLegacyGlobalZoom() {
  const raw = await settingsService.getAsync(PO_TABLE_ZOOM_KEY, String(PO_TABLE_ZOOM_DEFAULT));
  return parsePoTableZoom(raw);
}

async function getZoom(userId = null) {
  try {
    const personal = await readPersonalZoom(userId);
    if (personal != null) return personal;
  } catch {
    /* DB-fout: val terug op globale default */
  }
  try {
    return await readLegacyGlobalZoom();
  } catch {
    return PO_TABLE_ZOOM_DEFAULT;
  }
}

async function setZoom(raw, userId = null) {
  const value = parsePoTableZoom(raw);
  if (!userId) return value;

  const pool = await sqlPool.getSqlPool();
  const existingResult = await pool.request()
    .input('userId', sql.Int, userId)
    .input('boardKey', sql.NVarChar(64), PO_TABLE_ZOOM_BOARD_KEY)
    .query(`
      SELECT settings_json
      FROM dbo.user_board_settings
      WHERE user_id = @userId AND board_key = @boardKey
    `);

  let existing = {};
  if (existingResult.recordset.length) {
    try {
      existing = JSON.parse(existingResult.recordset[0].settings_json || '{}') || {};
    } catch {
      existing = {};
    }
  }
  const nextJson = JSON.stringify({ ...existing, poTableZoom: value });

  await pool.request()
    .input('userId', sql.Int, userId)
    .input('boardKey', sql.NVarChar(64), PO_TABLE_ZOOM_BOARD_KEY)
    .input('settingsJson', sql.NVarChar(sql.MAX), nextJson)
    .query(`
      MERGE dbo.user_board_settings AS target
      USING (SELECT @userId AS user_id, @boardKey AS board_key) AS source
        ON target.user_id = source.user_id AND target.board_key = source.board_key
      WHEN MATCHED THEN
        UPDATE SET settings_json = @settingsJson, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (user_id, board_key, settings_json, updated_at)
        VALUES (@userId, @boardKey, @settingsJson, SYSUTCDATETIME());
    `);

  return value;
}

module.exports = {
  PO_TABLE_ZOOM_KEY,
  PO_TABLE_ZOOM_BOARD_KEY,
  PO_TABLE_ZOOM_DEFAULT,
  PO_TABLE_ZOOM_MIN,
  PO_TABLE_ZOOM_MAX,
  clampPoTableZoom,
  parsePoTableZoom,
  zoomFromSettingsJson,
  getZoom,
  setZoom,
};
