'use strict';

const { normalizeTabsState, normalizeVendorAccount, vendorCanSeeView } = require('./viewTabs');

describe('server viewTabs', () => {
  it('normaliseert extra tabs en groepskleuren', () => {
    const normalized = normalizeTabsState({
      extraTabs: [{ id: 't1', name: ' Q1 ', extraFilters: { vendorAccount: { operator: 'equals', value: 'Q1' } } }],
      groups: [{ columnKey: 'vendorAccount', color: '#579bfc', namePrefix: 'Vendor' }],
    });
    expect(normalized.extraTabs[0].name).toBe('Q1');
    expect(normalized.groups[0].color).toBe('#579bfc');
    expect(normalized.groups[0].namePrefix).toBe('Vendor');
  });

  it('scoped een vendor-view op account', () => {
    expect(vendorCanSeeView({ scope: 'vendor', vendorAccount: '' }, 'Q1')).toBe(true);
    expect(vendorCanSeeView({ scope: 'vendor', vendorAccount: 'Q1' }, 'Q1')).toBe(true);
    expect(vendorCanSeeView({ scope: 'vendor', vendorAccount: 'Q1' }, 'Q2')).toBe(false);
    expect(normalizeVendorAccount('  Q000104  ')).toBe('Q000104');
  });
});
