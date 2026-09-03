'use strict';
const {
  attributeNameFromRaw,
  attributeDisplayValue,
  displayValueFromCacheRow,
  displayValueFromRecordKey,
  buildPavRecordKey,
  uniqueSortedValues,
  firstValueAndExtra,
} = require('./productAttributeValues');

describe('productAttributeValues', () => {
  it('leest AttributeName met fallback Name', () => {
    expect(attributeNameFromRaw({ AttributeName: 'Season' })).toBe('Season');
    expect(attributeNameFromRaw({ Name: 'Material' })).toBe('Material');
  });

  it('kiest de eerste niet-lege displaywaarde in keten-volgorde', () => {
    expect(attributeDisplayValue({ IntegerValue: 7 })).toBe('7');
    expect(attributeDisplayValue({ AttributeValue: 'SS26', TextValue: 'x' })).toBe('SS26');
    expect(attributeDisplayValue({ TextValue: 'Nova' })).toBe('Nova');
    expect(attributeDisplayValue({})).toBe('');
  });

  it('leest Text value uit cache-rij of uit de record-key', () => {
    expect(displayValueFromRecordKey('SBM-10002-24-01|Sole name|Nova')).toBe('Nova');
    expect(displayValueFromCacheRow({ attributeValue: null, textValue: 'Nova' })).toBe('Nova');
    expect(displayValueFromCacheRow({ attributeValue: null }, 'SBM-10002-24-01|Sole name|Nova')).toBe('Nova');
  });

  it('bouwt een 1:N cache-sleutel van max 128 tekens', () => {
    const keys = buildPavRecordKey({
      productNumber: 'SHOE-41',
      attributeName: 'Season',
      displayValue: 'SS26',
    });
    expect(keys).toEqual({ partitionKey: 'shared', recordKey: 'SHOE-41|Season|SS26' });
    expect(buildPavRecordKey({
      productNumber: 'A',
      attributeName: 'B',
      displayValue: 'x'.repeat(200),
    }).recordKey.length).toBe(128);
  });

  it('unieke waarden stabiel gesorteerd; eerste + extra count', () => {
    expect(uniqueSortedValues(['FW26', 'SS26', 'FW26'])).toEqual(['FW26', 'SS26']);
    expect(firstValueAndExtra(['FW26', 'SS26'])).toEqual({
      first: 'FW26',
      additionalCount: 1,
      allValuesLabel: 'FW26, SS26',
    });
    expect(firstValueAndExtra(['SS26'])).toEqual({
      first: 'SS26',
      additionalCount: 0,
      allValuesLabel: 'SS26',
    });
    expect(firstValueAndExtra([])).toEqual({ first: '', additionalCount: 0, allValuesLabel: '' });
  });
});
