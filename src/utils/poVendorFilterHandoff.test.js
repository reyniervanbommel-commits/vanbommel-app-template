import { beforeEach, describe, expect, it } from 'vitest';
import { readPoFilterByColumnForRccp, savePoFilterByColumnForRccp } from './poVendorFilterHandoff';

describe('poVendorFilterHandoff', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('saves and reads back the active PO filter', () => {
    const filterByColumn = { vendorAccount: { operator: 'equals', value: 'V000696' } };
    savePoFilterByColumnForRccp(filterByColumn);
    expect(readPoFilterByColumnForRccp()).toEqual(filterByColumn);
  });

  it('returns null when nothing was saved yet', () => {
    expect(readPoFilterByColumnForRccp()).toBeNull();
  });

  it('clears the stored filter when an empty filter is saved', () => {
    savePoFilterByColumnForRccp({ vendorAccount: { operator: 'equals', value: 'V000696' } });
    savePoFilterByColumnForRccp({});
    expect(readPoFilterByColumnForRccp()).toBeNull();
  });

  it('ignores corrupted JSON in storage', () => {
    window.sessionStorage.setItem('po:activeFilterByColumn', '{not-json');
    expect(readPoFilterByColumnForRccp()).toBeNull();
  });
});
