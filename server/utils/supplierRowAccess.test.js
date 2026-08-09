'use strict';

const { filterRowsForSupplier, getSupplierFilterColumnKey } = require('./supplierRowAccess');
// supplierRowAccess.js gebruikt het gedeelde settingsService-object (niet gedestructureerd),
// dus we kunnen getAsync direct op dat object vervangen voor de duur van de test.
const settingsService = require('../services/SettingsService');
const originalGetAsync = settingsService.getAsync;

afterEach(() => {
  settingsService.getAsync = originalGetAsync;
});

describe('filterRowsForSupplier', () => {
  it('houdt alleen rijen over waarvan de partition+record-key in visibleKeys staat', () => {
    const rows = [
      { partitionKey: 'PO', recordKey: '1' },
      { partitionKey: 'PO', recordKey: '2' },
      { partitionKey: 'PO', recordKey: '3' },
    ];
    const visibleKeys = new Set(['PO|1', 'PO|3']);

    expect(filterRowsForSupplier(rows, visibleKeys)).toEqual([
      { partitionKey: 'PO', recordKey: '1' },
      { partitionKey: 'PO', recordKey: '3' },
    ]);
  });

  it('ondersteunt zowel camelCase als snake_case veldnamen (DB-rows)', () => {
    const rows = [{ partition_key: 'PO', record_key: '5' }];
    const visibleKeys = new Set(['PO|5']);

    expect(filterRowsForSupplier(rows, visibleKeys)).toEqual(rows);
  });

  it('geeft een lege lijst als geen enkele rij zichtbaar is — voorkomt datalek naar andere suppliers', () => {
    const rows = [{ partitionKey: 'PO', recordKey: '1' }];
    const visibleKeys = new Set(['PO|999']);

    expect(filterRowsForSupplier(rows, visibleKeys)).toEqual([]);
  });

  it('geeft een lege lijst voor een lege visibleKeys-set', () => {
    const rows = [{ partitionKey: 'PO', recordKey: '1' }];

    expect(filterRowsForSupplier(rows, new Set())).toEqual([]);
  });
});

describe('getSupplierFilterColumnKey', () => {
  it('delegeert naar SettingsService met de juiste key en default', async () => {
    settingsService.getAsync = vi.fn().mockResolvedValue('vendorAccount');

    const result = await getSupplierFilterColumnKey();

    expect(result).toBe('vendorAccount');
    expect(settingsService.getAsync).toHaveBeenCalledWith('SUPPLIER_FILTER_COLUMN_KEY', 'vendorAccount');
  });
});
