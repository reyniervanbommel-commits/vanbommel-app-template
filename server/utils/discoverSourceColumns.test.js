'use strict';

const { listStaleSourceColumns } = require('./discoverSourceColumns');

describe('listStaleSourceColumns', () => {
  const productName = { id: 11, source: 'source', sourceField: 'ProductName', key: 'productName' };
  const itemNumber = { id: 12, source: 'source', sourceField: 'ItemNumber', key: 'itemNumber' };
  const searchName = { id: 13, source: 'source', sourceField: 'SearchName', key: 'searchName' };
  const customNote = { id: 14, source: 'custom', sourceField: null, key: 'note' };

  it('merkt een bronkolom als stale wanneer D365 het veld niet teruggeeft', () => {
    const stale = listStaleSourceColumns(
      [productName, itemNumber, searchName],
      [{ field: 'ItemNumber' }, { field: 'SearchName' }],
      ['ItemNumber']
    );
    expect(stale).toEqual([productName]);
  });

  it('wist niets als de discovery-set leeg is', () => {
    expect(listStaleSourceColumns([productName, itemNumber], [], ['ItemNumber'])).toEqual([]);
  });

  it('laat custom-kolommen en beschermde sleutelvelden staan', () => {
    const stale = listStaleSourceColumns(
      [productName, itemNumber, customNote],
      [{ field: 'SearchName' }],
      ['ItemNumber']
    );
    expect(stale).toEqual([productName]);
  });
});

describe('D365 sample values', () => {
  const {
    lookupRawFieldValue,
    firstNonEmptySample,
    fillMissingSamplesFromRawRows,
    sampleMapFromDiscoveredFields,
  } = require('./discoverSourceColumns');

  it('vindt een veld case-insensitive in een OData-rij', () => {
    expect(lookupRawFieldValue({ ItemNumber: 'ART-1' }, 'itemNumber')).toBe('ART-1');
  });

  it('pakt de eerste niet-lege sample over meerdere rijen', () => {
    expect(firstNonEmptySample(
      [{ SearchName: '' }, { SearchName: 'Boot' }],
      'SearchName',
    )).toBe('Boot');
  });

  it('vult ontbrekende preview-samples vanuit ruwe D365-rijen', () => {
    const filled = fillMissingSamplesFromRawRows(
      { sampleByField: { ItemNumber: '—', SearchName: '—' } },
      ['ItemNumber', 'SearchName'],
      [{ itemNumber: 'ART-9', SearchName: 'Sneaker' }],
    );
    expect(filled.sampleByField.ItemNumber).toBe('ART-9');
    expect(filled.sampleByField.SearchName).toBe('Sneaker');
  });

  it('zet discovered samples om naar een lookup per veld', () => {
    expect(sampleMapFromDiscoveredFields([
      { field: 'ItemNumber', sample: 'ART-1' },
      { field: 'ProductName', sample: null },
    ])).toEqual({
      ItemNumber: 'ART-1',
      ProductName: '—',
    });
  });
});
