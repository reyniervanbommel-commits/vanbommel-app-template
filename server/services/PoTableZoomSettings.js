'use strict';

/**
 * Globale PO-tabelzoom in dbo.app_settings. Eén waarde voor alle gebruikers.
 */

const settingsService = require('./SettingsService');

const PO_TABLE_ZOOM_KEY = 'PO_TABLE_ZOOM';
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

async function getZoom() {
  const raw = await settingsService.getAsync(PO_TABLE_ZOOM_KEY, String(PO_TABLE_ZOOM_DEFAULT));
  return parsePoTableZoom(raw);
}

async function setZoom(raw, userId = null) {
  const value = parsePoTableZoom(raw);
  await settingsService.set(PO_TABLE_ZOOM_KEY, String(value), userId);
  return value;
}

module.exports = {
  PO_TABLE_ZOOM_KEY,
  PO_TABLE_ZOOM_DEFAULT,
  PO_TABLE_ZOOM_MIN,
  PO_TABLE_ZOOM_MAX,
  clampPoTableZoom,
  parsePoTableZoom,
  getZoom,
  setZoom,
};
