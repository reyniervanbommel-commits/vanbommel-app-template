import { describe, expect, it } from 'vitest';
import { capacityPlanningRowsToSheetData } from './rccpCapacityPlanningExport';

describe('capacityPlanningRowsToSheetData', () => {
  it('maps rows to import-compatible headers and values', () => {
    const sheet = capacityPlanningRowsToSheetData([
      {
        vendorAccount: 'V001',
        periodYear: 2026,
        isoWeek: 12,
        capacityCategory: 'Sewing',
        availableQty: 100,
      },
    ]);

    expect(sheet[0]).toEqual([
      'VendorCode',
      'Year',
      'ISOWeek',
      'CapacityCategory',
      'CapacityQuantity',
    ]);
    expect(sheet[1]).toEqual(['V001', 2026, 12, 'Sewing', 100]);
  });
});
