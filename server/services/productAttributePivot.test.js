'use strict';
const { buildPivotIndex, applyProductAttributePivot } = require('./productAttributePivot');

describe('productAttributePivot', () => {
  it('vult first value en pavExtras alleen bij extra unieke waarden', () => {
    const index = buildPivotIndex([
      { productNumber: 'SHOE-41', attributeName: 'Season', attributeValue: 'FW26' },
      { productNumber: 'SHOE-41', attributeName: 'Season', attributeValue: 'SS26' },
    ]);
    const values = {};
    const extras = applyProductAttributePivot(values, 'SHOE-41', index, [
      { key: 'pav_season', options: { kind: 'product-attribute', attributeName: 'Season' } },
    ]);
    expect(values.pav_season).toBe('FW26');
    expect(extras.pav_season).toEqual({ additionalCount: 1, allValuesLabel: 'FW26, SS26' });
  });

  it('leest Text value als Attribute value leeg is, ook via record-key', () => {
    const fromText = {};
    applyProductAttributePivot(fromText, 'SHOE-41', buildPivotIndex([
      { productNumber: 'SHOE-41', attributeName: 'Sole name', attributeValue: null, textValue: 'Nova' },
    ]), [
      { key: 'pav_sole_name', options: { kind: 'product-attribute', attributeName: 'Sole name' } },
    ]);
    expect(fromText.pav_sole_name).toBe('Nova');

    const fromKeyOnly = {};
    applyProductAttributePivot(fromKeyOnly, 'SHOE-41', buildPivotIndex([
      { textValue: 'Nova', recordKey: 'SHOE-41|Sole name|Nova' },
    ]), [
      { key: 'pav_sole_name', options: { kind: 'product-attribute', attributeName: 'Sole name' } },
    ]);
    expect(fromKeyOnly.pav_sole_name).toBe('Nova');
  });

  it('zet null bij geen match, geen 0', () => {
    const values = {};
    applyProductAttributePivot(values, 'MISSING', buildPivotIndex([]), [
      { key: 'pav_season', options: { kind: 'product-attribute', attributeName: 'Season' } },
    ]);
    expect(values.pav_season).toBeNull();
  });
});
