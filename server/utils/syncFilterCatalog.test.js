'use strict';

const { buildAllowedSyncFilterFields, normalizeLevel } = require('./syncFilterCatalog');

describe('syncFilterCatalog', () => {
  it('combines cache catalog fields with d365 registry columns', () => {
    const filterMeta = {
      catalog: {
        header: [{ field: 'PurchStatus' }],
        line: [{ field: 'ItemNumber' }],
      },
    };
    const columns = [
      { source: 'd365', level: 'header', d365Field: 'PurchaseOrderStatus' },
      { source: 'custom', level: 'header', d365Field: 'InternalOnly' },
    ];

    const result = buildAllowedSyncFilterFields(filterMeta, columns);

    expect(result.has('header|PurchStatus')).toBe(true);
    expect(result.has('line|ItemNumber')).toBe(true);
    expect(result.has('header|PurchaseOrderStatus')).toBe(true);
    expect(result.has('header|InternalOnly')).toBe(false);
  });

  it('guards against invalid entries and unknown levels', () => {
    const result = buildAllowedSyncFilterFields(
      { catalog: { header: [{ field: '' }], line: [{ field: null }] } },
      [{ source: 'd365', level: 'details', d365Field: 'ItemId' }]
    );
    expect(result.size).toBe(0);
  });

  it('normalizes known levels only', () => {
    expect(normalizeLevel('HEADER')).toBe('header');
    expect(normalizeLevel('line')).toBe('line');
    expect(normalizeLevel('other')).toBeNull();
  });
});
