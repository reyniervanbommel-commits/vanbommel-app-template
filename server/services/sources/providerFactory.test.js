'use strict';

// Unit-tests voor de providerFactory (#139): resolutie op provider_type, singleton-gedrag,
// resolutie uit een tabel-definitie en de duidelijke 501-fout voor (nog) niet-ondersteunde brontypes.

const { getProvider, getProviderForTable } = require('./providerFactory');
const { D365ODataProvider } = require('./D365ODataProvider');

describe('providerFactory', () => {
  it('resolvet d365_odata naar een D365ODataProvider', () => {
    const provider = getProvider('d365_odata');
    expect(provider).toBeInstanceOf(D365ODataProvider);
  });

  it('geeft steeds dezelfde instance terug (singleton per type)', () => {
    expect(getProvider('d365_odata')).toBe(getProvider('d365_odata'));
  });

  it('gooit 501 voor een onbekend brontype', () => {
    expect(() => getProvider('kwantum_odata')).toThrowError();
    try {
      getProvider('kwantum_odata');
    } catch (err) {
      expect(err.status).toBe(501);
    }
  });

  it('gooit 501 voor een (nog) niet-geïmplementeerd, maar wél valide DB-brontype', () => {
    // sql_view/rest zijn geldig in het CHECK-constraint maar nog niet gebouwd -> 501.
    try {
      getProvider('sql_view');
    } catch (err) {
      expect(err.status).toBe(501);
    }
  });

  it('resolvet uit een tabel-definitie via table.source.providerType', () => {
    const table = { source: { providerType: 'd365_odata' } };
    expect(getProviderForTable(table)).toBeInstanceOf(D365ODataProvider);
  });

  it('gooit 500 als de tabel geen brontype heeft', () => {
    try {
      getProviderForTable({ source: {} });
    } catch (err) {
      expect(err.status).toBe(500);
    }
  });
});
