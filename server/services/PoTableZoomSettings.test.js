'use strict';

const settingsService = require('./SettingsService');
const poTableZoomSettings = require('./PoTableZoomSettings');
const sqlPool = require('../utils/sqlPool');
const { createMockPool } = require('../test-utils/mockSqlPool');

const originalGetAsync = settingsService.getAsync;
const originalSet = settingsService.set;
const originalGetSqlPool = sqlPool.getSqlPool;

afterEach(() => {
  settingsService.getAsync = originalGetAsync;
  settingsService.set = originalSet;
  sqlPool.getSqlPool = originalGetSqlPool;
});

describe('PoTableZoomSettings', () => {
  it('parses finite numbers and rejects garbage', () => {
    expect(poTableZoomSettings.parsePoTableZoom(0.9)).toBe(0.9);
    expect(poTableZoomSettings.parsePoTableZoom('0.8')).toBe(0.8);
    expect(poTableZoomSettings.parsePoTableZoom('1);hack')).toBe(0.85);
    expect(poTableZoomSettings.parsePoTableZoom(undefined)).toBe(0.85);
    expect(poTableZoomSettings.clampPoTableZoom(0.5)).toBe(0.75);
    expect(poTableZoomSettings.clampPoTableZoom(2)).toBe(1.1);
  });

  it('leest poTableZoom uit settings JSON', () => {
    expect(poTableZoomSettings.zoomFromSettingsJson('{"poTableZoom":0.95}')).toBe(0.95);
    expect(poTableZoomSettings.zoomFromSettingsJson('{}')).toBeNull();
    expect(poTableZoomSettings.zoomFromSettingsJson('not-json')).toBeNull();
  });

  it('getZoom zonder userId valt terug op de globale app_settings-key', async () => {
    settingsService.getAsync = vi.fn().mockResolvedValue('1.05');
    await expect(poTableZoomSettings.getZoom()).resolves.toBe(1.05);
    expect(settingsService.getAsync).toHaveBeenCalledWith('PO_TABLE_ZOOM', '0.85');
  });

  it('getZoom leest de persoonlijke zoom voor een userId', async () => {
    const pool = createMockPool({
      queries: [{ recordset: [{ settings_json: '{"poTableZoom":0.95}' }] }],
    });
    sqlPool.getSqlPool = vi.fn().mockResolvedValue(pool);
    settingsService.getAsync = vi.fn();
    await expect(poTableZoomSettings.getZoom(7)).resolves.toBe(0.95);
    expect(settingsService.getAsync).not.toHaveBeenCalled();
  });

  it('getZoom valt terug op globaal als de gebruiker nog geen zoom heeft', async () => {
    const pool = createMockPool({ queries: [{ recordset: [] }] });
    sqlPool.getSqlPool = vi.fn().mockResolvedValue(pool);
    settingsService.getAsync = vi.fn().mockResolvedValue('0.8');
    await expect(poTableZoomSettings.getZoom(7)).resolves.toBe(0.8);
  });

  it('setZoom zonder userId persist niet', async () => {
    sqlPool.getSqlPool = vi.fn();
    await expect(poTableZoomSettings.setZoom(1, null)).resolves.toBe(1);
    expect(sqlPool.getSqlPool).not.toHaveBeenCalled();
  });

  it('setZoom schrijft de geclampte persoonlijke waarde', async () => {
    const pool = createMockPool({
      queries: [{ recordset: [{ settings_json: '{"other":1}' }] }, { recordset: [] }],
    });
    sqlPool.getSqlPool = vi.fn().mockResolvedValue(pool);
    await expect(poTableZoomSettings.setZoom('1);hack', 9)).resolves.toBe(0.85);
    expect(pool.calls[1].inputs.settingsJson).toBe(JSON.stringify({ other: 1, poTableZoom: 0.85 }));
    expect(pool.calls[1].inputs.userId).toBe(9);
    expect(pool.calls[1].inputs.boardKey).toBe('po-table-zoom');
  });
});
