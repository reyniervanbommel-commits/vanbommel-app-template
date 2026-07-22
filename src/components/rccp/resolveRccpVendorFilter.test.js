import { describe, expect, it } from 'vitest';
import { resolveDefaultRccpVendor, resolveRccpVendorFromFilter } from './resolveRccpVendorFilter';

describe('resolveRccpVendorFromFilter', () => {
  it('returns vendor when equals filter is active on vendorAccount', () => {
    const result = resolveRccpVendorFromFilter({
      vendorAccount: { operator: 'equals', value: 'V001' },
    });
    expect(result).toBe('V001');
  });

  it('ignores contains filters', () => {
    const result = resolveRccpVendorFromFilter({
      vendorName: { operator: 'contains', value: 'Acme' },
    });
    expect(result).toBeUndefined();
  });

  it('falls back to vendorName with equals', () => {
    const result = resolveRccpVendorFromFilter({
      vendorName: { operator: 'equals', value: 'Acme BV' },
    });
    expect(result).toBe('Acme BV');
  });
});

describe('resolveDefaultRccpVendor', () => {
  const vendors = ['V000583', 'V000696'];
  const vendorNames = {
    V000583: 'Belcinto Vasconcelos E Ca, Lda',
    V000696: 'Procalcado For Ever',
  };

  it('uses the PO filter vendor (by number) when it exists in the vendor list', () => {
    const result = resolveDefaultRccpVendor({
      vendors,
      vendorNames,
      filterByColumn: { vendorAccount: { operator: 'equals', value: 'V000696' } },
    });
    expect(result).toBe('V000696');
  });

  it('uses the PO filter vendor (by name) when it exists in the vendor list', () => {
    const result = resolveDefaultRccpVendor({
      vendors,
      vendorNames,
      filterByColumn: { vendorName: { operator: 'equals', value: 'Procalcado For Ever' } },
    });
    expect(result).toBe('V000696');
  });

  it('falls back to the first vendor when there is no PO filter', () => {
    const result = resolveDefaultRccpVendor({ vendors, vendorNames, filterByColumn: null });
    expect(result).toBe('V000583');
  });

  it('falls back to the first vendor when the filtered vendor no longer exists', () => {
    const result = resolveDefaultRccpVendor({
      vendors,
      vendorNames,
      filterByColumn: { vendorAccount: { operator: 'equals', value: 'V999999' } },
    });
    expect(result).toBe('V000583');
  });

  it('returns an empty string when there are no vendors at all', () => {
    const result = resolveDefaultRccpVendor({ vendors: [], vendorNames: {}, filterByColumn: null });
    expect(result).toBe('');
  });
});
