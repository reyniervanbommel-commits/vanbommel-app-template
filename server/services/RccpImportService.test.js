'use strict';

const { validateImportRow, previewImport } = require('../services/RccpImportService');

describe('RccpImportService.validateImportRow', () => {
  it('accepts a valid row', () => {
    expect(validateImportRow({
      vendorAccount: 'V001',
      periodYear: 2026,
      isoWeek: 10,
      capacityCategory: 'Knitwear',
      availableQty: 120,
    })).toEqual([]);
  });

  it('rejects invalid week and quantity', () => {
    const errors = validateImportRow({
      vendorAccount: 'V001',
      periodYear: 2026,
      isoWeek: 54,
      capacityCategory: 'Knitwear',
      availableQty: -1,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('RccpImportService.previewImport', () => {
  it('returns a header error for empty workbooks', async () => {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const preview = await previewImport(buffer);
    expect(preview.errors.length).toBeGreaterThan(0);
  });
});
