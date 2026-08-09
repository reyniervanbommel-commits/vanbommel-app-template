'use strict';

const { createMockPool } = require('../test-utils/mockSqlPool');

// SettingsService.js destructureert getSqlPool bij require-tijd en houdt daarna module-scoped
// cache/init-state bij (_cache, _initialized) die voor de hele levensduur van dit testbestand
// gedeeld blijft (vi.resetModules() bleek geen betrouwbare fresh-module-garantie te geven voor
// deze CJS-bestanden — zelfde patroon/les als AuthService.test.js: vervang getSqlPool VOORDAT
// SettingsService gerequired wordt, en vervang daarna alleen nog de pool zelf per test).
// Omdat _initialized na de eerste succesvolle init() permanent true blijft binnen dit bestand,
// staat de "laadt vanuit de DB"-test bewust als eerste — dat is de enige test die de echte
// init()-transitie (false → true) meemaakt.
const sqlPoolModule = require('../utils/sqlPool');
const mockState = { pool: null };
sqlPoolModule.getSqlPool = async () => mockState.pool;

const settingsService = require('./SettingsService');

describe('SettingsService', () => {
  it('init() laadt settings uit de DB in de cache (eenmalige eerste initialisatie)', async () => {
    mockState.pool = createMockPool({
      queries: [{ recordset: [{ setting_key: 'FOO', setting_value: 'bar' }] }],
    });

    await settingsService.init();

    expect(settingsService.get('FOO')).toBe('bar');
  });

  it('get() valt terug op env var, dan op de fallback, voor een key buiten de cache', () => {
    process.env.SETTINGS_TEST_ENV_KEY = 'from-env';

    expect(settingsService.get('SETTINGS_TEST_ENV_KEY')).toBe('from-env');
    expect(settingsService.get('SETTINGS_TEST_MISSING_KEY', 'fallback-value')).toBe('fallback-value');

    delete process.env.SETTINGS_TEST_ENV_KEY;
  });

  it('raakt de DB niet opnieuw aan zodra al geïnitialiseerd — cache blijft leidend', async () => {
    mockState.pool = { request: () => { throw new Error('mag niet aangeroepen worden — al geïnitialiseerd'); } };

    const result = await settingsService.getAsync('FOO', 'fallback');

    expect(result).toBe('bar'); // uit de cache van de eerste test, geen nieuwe DB-call nodig
  });

  it('set() schrijft weg via een MERGE-query en werkt de cache direct bij', async () => {
    const pool = createMockPool({ queries: [{ recordset: [] }] });
    mockState.pool = pool;

    await settingsService.set('FOO', 'new-value', 7);

    expect(settingsService.get('FOO')).toBe('new-value');
    expect(pool.calls).toHaveLength(1);
    expect(pool.calls[0].sql).toContain('MERGE dbo.app_settings');
    expect(pool.calls[0].inputs.userId).toBe(7);
  });

  it('saveODataConfig slaat alleen de meegegeven ODATA_KEYS op, niet elke arbitraire key', async () => {
    const pool = createMockPool({ queries: [{ recordset: [] }] });
    mockState.pool = pool;

    await settingsService.saveODataConfig({
      D365_ODATA_BASE_URL: 'https://example.com',
      NOT_AN_ODATA_KEY: 'should be ignored',
    });

    expect(pool.calls).toHaveLength(1);
    expect(pool.calls[0].inputs.key).toBe('D365_ODATA_BASE_URL');
  });
});
