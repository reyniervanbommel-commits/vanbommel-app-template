'use strict';

const { isExcelTable, orderLookupTargetKeys, formatEntityRefreshError } = require('./refreshCascadeOrder');

describe('refreshCascadeOrder', () => {
  it('zet Excel-doeltabellen achter D365-entiteiten', async () => {
    const loadTable = async (key) => ({
      key,
      source: { providerType: key.startsWith('excel') ? 'excel' : 'd365-odata' },
    });
    const ordered = await orderLookupTargetKeys(
      ['excel-map1', 'vendors', 'items', 'product-receipt-lines'],
      loadTable,
    );
    expect(ordered).toEqual(['vendors', 'items', 'product-receipt-lines', 'excel-map1']);
  });

  it('zet product-attribute-values ná items', async () => {
    const loadTable = async (key) => ({ key, source: { providerType: 'd365-odata' } });
    const ordered = await orderLookupTargetKeys(
      ['product-attribute-values', 'vendors', 'items'],
      loadTable,
    );
    expect(ordered.indexOf('items')).toBeLessThan(ordered.indexOf('product-attribute-values'));
    expect(ordered[0]).toBe('vendors');
  });

  it('herkent excel-provider case-insensitive', () => {
    expect(isExcelTable({ source: { providerType: 'Excel' } })).toBe(true);
    expect(isExcelTable({ source: { providerType: 'd365-odata' } })).toBe(false);
  });

  it('zet HTTP-status in de entity-fouttekst', () => {
    expect(formatEntityRefreshError('items', { status: 400, message: 'Invalid $select' }))
      .toBe('HTTP 400: Invalid $select');
  });
});
