import { describe, expect, it } from 'vitest';
import { rccpColumnGroupLabel } from './rccpColumnGroups';

describe('rccpColumnGroupLabel', () => {
  it('zet native PO-kolommen in Purchase orders', () => {
    expect(rccpColumnGroupLabel({ key: 'requestedDeliveryDate', source: 'source' })).toBe('Purchase orders');
    expect(rccpColumnGroupLabel({ key: 'new_formula', source: 'custom' })).toBe('Purchase orders');
  });

  it('groepeert lookup-kolommen per doeltabel', () => {
    expect(rccpColumnGroupLabel({
      source: 'lookup',
      lookup: { targetTableKey: 'vendors' },
    })).toBe('Vendors');
    expect(rccpColumnGroupLabel({
      source: 'lookup',
      lookup: { targetTableKey: 'items' },
    })).toBe('Items');
    expect(rccpColumnGroupLabel({
      source: 'lookup',
      lookup: { targetTableKey: 'product-receipt-lines' },
    })).toBe('Receipt lines');
    expect(rccpColumnGroupLabel({
      source: 'lookup',
      lookup: { targetTableKey: 'upload-2' },
    })).toBe('Excel upload');
  });
});
