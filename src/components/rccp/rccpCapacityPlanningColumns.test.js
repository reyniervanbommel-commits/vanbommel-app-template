import { describe, expect, it } from 'vitest';
import {
  rowMatchesCapacityFilters,
  sortCapacityRows,
  computeCapacityColumnWidths,
} from './rccpCapacityPlanningColumns';

describe('rowMatchesCapacityFilters', () => {
  const row = {
    vendorAccount: 'V001',
    periodYear: 2026,
    isoWeek: 12,
    capacityCategory: 'Sewing',
    availableQty: 100,
  };

  it('matches when filters are empty', () => {
    expect(rowMatchesCapacityFilters(row, {
      vendorAccount: '',
      periodYear: '',
      isoWeek: '',
      capacityCategory: '',
      availableQty: '',
    })).toBe(true);
  });

  it('filters by partial column text', () => {
    expect(rowMatchesCapacityFilters(row, {
      vendorAccount: 'v001',
      periodYear: '202',
      isoWeek: '1',
      capacityCategory: 'sew',
      availableQty: '10',
    })).toBe(true);
  });

  it('returns false when a column does not match', () => {
    expect(rowMatchesCapacityFilters(row, {
      vendorAccount: 'V002',
      periodYear: '',
      isoWeek: '',
      capacityCategory: '',
      availableQty: '',
    })).toBe(false);
  });
});

describe('sortCapacityRows', () => {
  const rows = [
    { vendorAccount: 'B', isoWeek: 2, availableQty: 20 },
    { vendorAccount: 'A', isoWeek: 10, availableQty: 5 },
  ];

  it('sorts numeric columns numerically', () => {
    expect(sortCapacityRows(rows, 'isoWeek', 'asc').map((row) => row.isoWeek)).toEqual([2, 10]);
  });

  it('sorts text columns alphabetically', () => {
    expect(sortCapacityRows(rows, 'vendorAccount', 'asc').map((row) => row.vendorAccount)).toEqual(['A', 'B']);
  });
});

describe('computeCapacityColumnWidths', () => {
  it('sizes columns from header and cell content', () => {
    const measureCtx = {
      measureText: (text) => ({ width: String(text).length * 8 }),
    };
    const widths = computeCapacityColumnWidths([
      { vendorAccount: 'V1', periodYear: 2026, isoWeek: 12, capacityCategory: 'Cut', availableQty: 100 },
    ], measureCtx);

    expect(widths.vendorAccount).toBeGreaterThan(widths.isoWeek);
    expect(widths.capacityCategory).toBeGreaterThanOrEqual(80);
  });
});
