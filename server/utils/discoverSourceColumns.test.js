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

  it('merkt $select-velden die D365 niet in een volle record teruggeeft', () => {
    const { listSelectFieldsMissingFromRecord, formatSelectDropNotice } = require('./discoverSourceColumns');
    expect(listSelectFieldsMissingFromRecord(
      ['dataAreaId', 'ItemNumber', 'ProductName', 'ItemGroupId'],
      { dataAreaId: 'WHSL', ItemNumber: 'ART-1', '@odata.etag': 'W/"1"' },
    )).toEqual(['ProductName', 'ItemGroupId']);
    expect(formatSelectDropNotice(['ProductName', 'ItemGroupId']))
      .toBe('Removed from $select (not returned by D365): ProductName, ItemGroupId');
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

describe('inferSourceDataType', () => {
  const { inferSourceDataType, shouldPromoteSourceDataType } = require('./discoverSourceColumns');

  it('herkent een D365 ISO-datetime string als date', () => {
    expect(inferSourceDataType('2050-12-31T12:00:00Z')).toBe('date');
    expect(inferSourceDataType('2026-03-10T00:00:00.000Z')).toBe('date');
  });

  it('herkent een ISO-datum zonder tijd als date', () => {
    expect(inferSourceDataType('2026-03-10')).toBe('date');
  });

  it('gebruikt de D365-veldnaam wanneer de sample leeg is', () => {
    expect(inferSourceDataType(null, 'ConfirmedDeliveryDate')).toBe('date');
    expect(inferSourceDataType('', 'CreatedDateTime')).toBe('date');
  });

  it('laat echte tekst- en getalwaarden met rust', () => {
    expect(inferSourceDataType('Q000104', 'OrderVendorAccountNumber')).toBe('text');
    expect(inferSourceDataType(12.5, 'LineAmount')).toBe('number');
    expect(inferSourceDataType(true)).toBe('boolean');
    expect(inferSourceDataType(new Date('2026-03-10T00:00:00Z'))).toBe('date');
  });

  it('promoveert alleen text naar een scherper type', () => {
    expect(shouldPromoteSourceDataType('text', 'date')).toBe(true);
    expect(shouldPromoteSourceDataType('date', 'text')).toBe(false);
    expect(shouldPromoteSourceDataType('number', 'date')).toBe(false);
  });
});

describe('listSourceColumnsToPromote', () => {
  const { listSourceColumnsToPromote } = require('./discoverSourceColumns');

  it('merkt een bestaande text-kolom ConfirmedDeliveryDate als date', () => {
    const existing = [{
      id: 9,
      source: 'source',
      sourceField: 'ConfirmedDeliveryDate',
      dataType: 'text',
    }];
    const discovered = [{ field: 'ConfirmedDeliveryDate', dataType: 'date' }];
    expect(listSourceColumnsToPromote(existing, discovered)).toEqual([
      { id: 9, dataType: 'date' },
    ]);
  });

  it('laat een kolom die al date is met rust', () => {
    const existing = [{
      id: 3,
      source: 'source',
      sourceField: 'RequestedDeliveryDate',
      dataType: 'date',
    }];
    expect(listSourceColumnsToPromote(existing, [
      { field: 'RequestedDeliveryDate', dataType: 'date' },
    ])).toEqual([]);
  });
});
