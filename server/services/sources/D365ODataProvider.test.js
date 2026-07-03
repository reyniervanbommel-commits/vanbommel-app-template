'use strict';

const { normalizeEntityPath } = require('./D365ODataProvider');

describe('D365ODataProvider.normalizeEntityPath', () => {
  it('laat een absoluut /data-pad ongemoeid', () => {
    expect(normalizeEntityPath('/data/VendorsV2')).toBe('/data/VendorsV2');
  });

  it('prefixt een kale entiteitsnaam met /data/', () => {
    expect(normalizeEntityPath('ReleasedProductsV2')).toBe('/data/ReleasedProductsV2');
  });

  it('trimt witruimte', () => {
    expect(normalizeEntityPath('  /data/VendorsV2  ')).toBe('/data/VendorsV2');
  });

  it('gooit bij een lege waarde', () => {
    expect(() => normalizeEntityPath('')).toThrow();
    expect(() => normalizeEntityPath(null)).toThrow();
  });
});
