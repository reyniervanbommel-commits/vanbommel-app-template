'use strict';

const {
  expandVendorGroupRules,
  listVendorGroupIds,
  collectAccountsFromVendorRows,
  vendorGroupCatalogEntry,
  isRecommendedFilterField,
  NO_MATCH_VALUE,
} = require('./vendorGroupSyncFilter');

describe('vendorGroupSyncFilter', () => {
  it('zet een vendor-group regel om naar OrderVendorAccountNumber one-of', () => {
    const expanded = expandVendorGroupRules([
      { field: 'VendorGroupId', operator: 'eq', value: 'DOM', valueType: 'text' },
      { field: 'PurchaseOrderStatus', operator: 'eq', value: 'Backorder', valueType: 'enum' },
    ], ['V0001', 'V0002']);
    expect(expanded).toEqual([
      { field: 'PurchaseOrderStatus', operator: 'eq', value: 'Backorder', valueType: 'enum' },
      {
        level: 'header',
        field: 'OrderVendorAccountNumber',
        operator: 'oneof',
        valueType: 'text',
        value: ['V0001', 'V0002'],
      },
    ]);
  });

  it('matcht niets wanneer de groep geen leveranciers heeft', () => {
    const expanded = expandVendorGroupRules([
      { field: 'VendorGroupId', operator: 'oneof', value: 'A, B', valueType: 'text' },
    ], []);
    expect(expanded[0].field).toBe('PurchaseOrderNumber');
    expect(expanded[0].value).toBe(NO_MATCH_VALUE);
  });

  it('leest groep-id\'s uit eq en oneof', () => {
    expect(listVendorGroupIds([
      { field: 'VendorGroupId', operator: 'eq', value: 'DOM' },
      { field: 'VendorGroupId', operator: 'oneof', value: 'INT, EXP' },
    ])).toEqual(['DOM', 'INT', 'EXP']);
  });

  it('haalt accounts uit vendor-cache rijen', () => {
    const accounts = collectAccountsFromVendorRows([
      { data_json: JSON.stringify({ vendorGroupId: 'DOM', vendorAccountNumber: 'V1' }) },
      { vendorGroupId: 'INT', vendorAccountNumber: 'V2' },
      { vendorGroupId: 'DOM', vendorAccountNumber: 'V3' },
    ], ['DOM']);
    expect(accounts.sort()).toEqual(['V1', 'V3']);
  });

  it('markeert groepsvelden als recommended', () => {
    expect(isRecommendedFilterField('VendorGroupId')).toBe(true);
    expect(isRecommendedFilterField('PurchaseOrderStatus')).toBe(true);
    expect(isRecommendedFilterField('OrderVendorAccountNumber')).toBe(false);
    expect(vendorGroupCatalogEntry().resolveVia).toBe('vendor-group');
  });
});
