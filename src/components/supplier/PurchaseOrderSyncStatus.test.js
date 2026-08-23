import { describe, expect, it } from 'vitest';
import { freshnessText } from './PurchaseOrderSyncStatus';

describe('freshnessText', () => {
  it('toont refreshing, bekende tijd of unknown', () => {
    expect(freshnessText(true, '3 minutes ago', true)).toBe('Refreshing...');
    expect(freshnessText(true, '3 minutes ago', false)).toBe('3 minutes ago');
    expect(freshnessText(false, null, false)).toBe('Unknown');
  });
});
