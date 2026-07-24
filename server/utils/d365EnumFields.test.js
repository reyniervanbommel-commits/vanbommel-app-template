'use strict';

const { isEnumField, enumTypeForField, D365_ENUM_FIELDS } = require('./d365EnumFields');
const { buildFilterCatalogPayload } = require('./tbSyncFilterCatalog');
const { compileSyncRules } = require('./odataSyncFilter');

describe('d365EnumFields registry', () => {
  it('herkent geregistreerde enum-velden en levert het juiste enumType', () => {
    expect(isEnumField('PurchaseOrderStatus')).toBe(true);
    expect(isEnumField('ProductType')).toBe(true);
    expect(enumTypeForField('PurchaseOrderStatus')).toBe('PurchStatus');
    expect(enumTypeForField('ProductType')).toBe('EcoResProductType');
  });

  it('behandelt niet-enum velden als tekst (geen enumType)', () => {
    expect(isEnumField('OrderVendorAccountNumber')).toBe(false);
    expect(isEnumField('')).toBe(false);
    expect(isEnumField(undefined)).toBe(false);
    expect(enumTypeForField('ItemNumber')).toBeNull();
  });
});

describe('tbSyncFilterCatalog valueType (registry-driven)', () => {
  it('classificeert enum-velden als enum en overige types correct', () => {
    const columns = [
      { source: 'd365', level: 'header', d365Field: 'PurchaseOrderStatus', dataType: 'text', label: 'Status' },
      { source: 'd365', level: 'header', d365Field: 'ProductType', dataType: 'text', label: 'Product type' },
      { source: 'd365', level: 'header', d365Field: 'LineAmount', dataType: 'number', label: 'Amount' },
      { source: 'd365', level: 'header', d365Field: 'DeliveryDate', dataType: 'date', label: 'Delivery' },
      { source: 'd365', level: 'header', d365Field: 'OrderVendorAccountNumber', dataType: 'text', label: 'Vendor' },
    ];

    const { catalog } = buildFilterCatalogPayload(columns);
    const byField = Object.fromEntries(catalog.header.map((c) => [c.field, c.valueType]));

    expect(byField.PurchaseOrderStatus).toBe('enum');
    expect(byField.ProductType).toBe('enum');
    expect(byField.LineAmount).toBe('number');
    expect(byField.DeliveryDate).toBe('date');
    expect(byField.OrderVendorAccountNumber).toBe('text');
  });
});

describe('ProductType enum compileert naar de EcoResProductType-namespace', () => {
  it('gebruikt de volledige namespace-notatie i.p.v. een string-literal', () => {
    expect(compileSyncRules([
      { field: 'ProductType', operator: 'eq', value: 'Item', valueType: 'enum', enumType: D365_ENUM_FIELDS.ProductType },
    ])).toBe("ProductType eq Microsoft.Dynamics.DataEntities.EcoResProductType'Item'");
  });
});
