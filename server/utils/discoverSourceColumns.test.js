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
