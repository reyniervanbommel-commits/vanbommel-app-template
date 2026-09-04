import { describe, expect, it } from 'vitest';
import {
  collectOrderNumbers,
  orderNumbersFingerprint,
  orderNumbersIfSubset,
  resolveSharedVendorFromOrders,
} from './poVisibleRccpScope';

describe('poVisibleRccpScope', () => {
  it('collects unique sorted order numbers', () => {
    expect(collectOrderNumbers([
      { orderNumber: 'PO-B' }, { orderNumber: 'PO-A' }, { orderNumber: 'PO-A' }, { orderNumber: '  ' },
    ])).toEqual(['PO-A', 'PO-B']);
  });

  it('joins order numbers with null separator for fingerprint', () => {
    expect(orderNumbersFingerprint(['PO-A', 'PO-B'])).toBe('PO-A\0PO-B');
  });

  it('returns one vendor when all visible rows share an account', () => {
    expect(resolveSharedVendorFromOrders([
      { values: { vendorAccount: 'V1' } },
      { vendorAccount: 'V1' },
    ], { vendors: ['V1', 'V2'], vendorNames: { V1: 'Acme' } })).toBe('V1');
  });

  it('maps a display name to the account', () => {
    expect(resolveSharedVendorFromOrders(
      [{ values: { vendorAccount: 'Acme' } }],
      { vendors: ['V1'], vendorNames: { V1: 'Acme' } },
    )).toBe('V1');
  });

  it('returns empty when two vendors are visible', () => {
    expect(resolveSharedVendorFromOrders([
      { values: { vendorAccount: 'V1' } },
      { values: { vendorAccount: 'V2' } },
    ], { vendors: ['V1', 'V2'], vendorNames: {} })).toBe('');
  });

  it('falls back to values.vendorAccount when top-level vendorAccount is empty', () => {
    expect(resolveSharedVendorFromOrders(
      [{ vendorAccount: '', values: { vendorAccount: 'V1' } }],
      { vendors: ['V1'], vendorNames: {} },
    )).toBe('V1');
  });

  it('falls back to values.vendorAccount when custom column key is empty', () => {
    expect(resolveSharedVendorFromOrders(
      [{ values: { customVendor: '', vendorAccount: 'V1' } }],
      { vendors: ['V1'], vendorNames: {}, vendorColumnKey: 'customVendor' },
    )).toBe('V1');
  });
});

describe('orderNumbersIfSubset', () => {
  it('returns undefined when visible POs match the full set', () => {
    expect(orderNumbersIfSubset(
      ['PO-A', 'PO-B'],
      [{ orderNumber: 'PO-B' }, { orderNumber: 'PO-A' }],
    )).toBeUndefined();
  });

  it('returns the visible list when at least one PO is hidden', () => {
    expect(orderNumbersIfSubset(
      ['PO-A'],
      [{ orderNumber: 'PO-A' }, { orderNumber: 'PO-B' }],
    )).toEqual(['PO-A']);
  });

  it('returns an empty list when every PO is filtered out', () => {
    expect(orderNumbersIfSubset([], [{ orderNumber: 'PO-A' }])).toEqual([]);
  });
});
