'use strict';

const { buildItemPickerLookupMap } = require('./rccpItemPickerLookup');

describe('buildItemPickerLookupMap', () => {
  const rows = [
    { recordKey: 'CBM-1', values: { productName: 'Boot', color: 'Black' } },
    { recordKey: 'CFM-2', values: { productName: 'Sneaker', color: 'White' } },
    { recordKey: 'CBM-1', values: { productName: 'Boot NL02', color: 'Brown' } },
  ];

  it('maps requested item numbers to the configured columns', () => {
    expect(buildItemPickerLookupMap(rows, ['CFM-2', 'MISSING'], ['productName', 'color'])).toEqual({
      'CFM-2': { productName: 'Sneaker', color: 'White' },
    });
  });

  it('keeps the first row when the same item number appears twice', () => {
    expect(buildItemPickerLookupMap(rows, ['CBM-1'], ['productName'])).toEqual({
      'CBM-1': { productName: 'Boot' },
    });
  });

  it('returns an empty map when nothing is requested', () => {
    expect(buildItemPickerLookupMap(rows, [], ['productName'])).toEqual({});
    expect(buildItemPickerLookupMap(rows, ['CBM-1'], [])).toEqual({});
  });
});
