import { describe, expect, it } from 'vitest';
import { resolveRccpVendorFromFilter } from './resolveRccpVendorFilter';

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
