'use strict';

const {
  parseConfirmedHistoryItemNumber,
  collectConfirmedHistoryVersions,
  buildConfirmedHistoryBatch,
  collectConfirmedHistoryKeys,
} = require('./rccpConfirmedHistory');

describe('parseConfirmedHistoryItemNumber', () => {
  it('rejects empty, wildcard and too long', () => {
    for (const value of ['', '  ', '*', '%', '_', 'a'.repeat(129)]) {
      expect(() => parseConfirmedHistoryItemNumber(value)).toThrow();
    }
  });

  it('trims and accepts an exact item number up to 128 characters', () => {
    expect(parseConfirmedHistoryItemNumber('  SKU-1  ')).toBe('SKU-1');
    expect(parseConfirmedHistoryItemNumber('a'.repeat(128))).toHaveLength(128);
  });
});

describe('collectConfirmedHistoryVersions', () => {
  it('uniques dates, keeps latest at, and skips sentinels', () => {
    const versions = collectConfirmedHistoryVersions([
      { at: '2026-04-01T10:00:00.000Z', newValue: '2026-03-23T00:00:00.000Z', oldValue: '1900-01-01T00:00:00.000Z' },
      { at: '2026-03-01T10:00:00.000Z', newValue: '2026-03-23T12:00:00.000Z', oldValue: null },
      { at: '2026-02-01T10:00:00.000Z', newValue: 'not-a-date', oldValue: '2026-03-16T00:00:00.000Z' },
    ]);
    expect(versions).toEqual([
      { at: '2026-04-01T10:00:00.000Z', date: '2026-03-23T00:00:00.000Z' },
      { at: '2026-02-01T10:00:00.000Z', date: '2026-03-16T00:00:00.000Z' },
    ]);
  });
});

describe('buildConfirmedHistoryBatch', () => {
  it('returns one parameterized query with no LIKE', () => {
    const { text, inputs } = buildConfirmedHistoryBatch({
      columnId: 12,
      keys: [
        { partitionKey: 'whsl', recordKey: 'PO-1', detailKey: 1 },
        { partitionKey: 'whsl', recordKey: 'PO-1', detailKey: 2 },
      ],
    });
    expect(text).toMatch(/tb_cell_history/);
    expect(text).toMatch(/tb_field_corrections/);
    expect(text).toMatch(/UNION/i);
    expect(text).not.toMatch(/LIKE/i);
    expect(inputs.find((input) => input.name === 'columnId')?.value).toBe(12);
    expect(inputs.filter((input) => input.name.startsWith('p')).length).toBe(2);
    expect(inputs.filter((input) => input.name.startsWith('r')).length).toBe(2);
    expect(inputs.filter((input) => input.name.startsWith('d')).length).toBe(2);
  });
});

describe('collectConfirmedHistoryKeys', () => {
  const window = { fromYear: 2026, fromWeek: 12, toYear: 2026, toWeek: 13 };
  const config = {
    dateColumnKey: 'requestedDeliveryDate',
    vendorColumnKey: 'vendorAccount',
    openMeasureKey: 'openQty',
    excludedStatuses: ['Canceled'],
  };

  it('keeps open lines of the item in vendor+window', () => {
    const keys = collectConfirmedHistoryKeys({
      rows: [{
        partitionKey: 'whsl',
        recordKey: 'PO-1',
        values: { vendorAccount: 'V001' },
        details: [
          {
            detailKey: 1,
            values: {
              itemNumber: 'SKU-1',
              openQty: 4,
              requestedDeliveryDate: '2026-03-16T00:00:00.000Z',
            },
          },
          {
            detailKey: 2,
            values: {
              itemNumber: 'SKU-2',
              openQty: 9,
              requestedDeliveryDate: '2026-03-16T00:00:00.000Z',
            },
          },
        ],
      }],
      config,
      window,
      vendorAccount: 'V001',
      itemNumber: 'SKU-1',
    });
    expect(keys).toEqual([
      { partitionKey: 'whsl', recordKey: 'PO-1', detailKey: 1 },
    ]);
  });
});
