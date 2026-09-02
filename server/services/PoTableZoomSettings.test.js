'use strict';

const settingsService = require('./SettingsService');
const poTableZoomSettings = require('./PoTableZoomSettings');

const originalGetAsync = settingsService.getAsync;
const originalSet = settingsService.set;

afterEach(() => {
  settingsService.getAsync = originalGetAsync;
  settingsService.set = originalSet;
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

  it('getZoom leest de app_settings-key en clamt', async () => {
    settingsService.getAsync = vi.fn().mockResolvedValue('1.05');
    await expect(poTableZoomSettings.getZoom()).resolves.toBe(1.05);
    expect(settingsService.getAsync).toHaveBeenCalledWith('PO_TABLE_ZOOM', '0.85');
  });

  it('setZoom schrijft alleen de geclampte waarde', async () => {
    settingsService.set = vi.fn().mockResolvedValue();
    await expect(poTableZoomSettings.setZoom('1);hack', 9)).resolves.toBe(0.85);
    expect(settingsService.set).toHaveBeenCalledWith('PO_TABLE_ZOOM', '0.85', 9);
  });
});
