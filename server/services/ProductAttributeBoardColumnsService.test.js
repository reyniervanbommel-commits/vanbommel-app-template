'use strict';
const {
  normalizeBoardColumnBody,
  unionAttributeNames,
} = require('./ProductAttributeBoardColumnsService');

describe('ProductAttributeBoardColumnsService', () => {
  it('eist een boolean visible en een geldige attributeName', () => {
    expect(() => normalizeBoardColumnBody({ attributeName: 'Season' })).toThrow(/visible/);
    expect(() => normalizeBoardColumnBody({ attributeName: 'Season', visible: 'true' })).toThrow(/visible/);
    expect(() => normalizeBoardColumnBody({ attributeName: '', visible: true })).toThrow(/attributeName/);
    expect(normalizeBoardColumnBody({ attributeName: ' Season ', visible: false }))
      .toEqual({ attributeName: 'Season', visible: false });
  });

  it('uniet cache-namen met bestaande kolommen, ook inactief', () => {
    const names = unionAttributeNames(['Season', 'Material'], [
      { key: 'pav_season', isActive: true, options: { kind: 'product-attribute', attributeName: 'Season' } },
      { key: 'pav_gone', isActive: false, options: { kind: 'product-attribute', attributeName: 'Legacy' } },
    ]);
    expect(names).toEqual([
      { name: 'Legacy', visible: false, columnKey: 'pav_gone' },
      { name: 'Material', visible: false, columnKey: 'pav_material' },
      { name: 'Season', visible: true, columnKey: 'pav_season' },
    ]);
  });
});
