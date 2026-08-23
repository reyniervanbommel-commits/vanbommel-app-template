import { describe, expect, it } from 'vitest';
import { freshnessText } from './PurchaseOrderSyncStatus';

describe('freshnessText', () => {
  it('toont refreshing, bekende tijd of unknown', () => {
    expect(freshnessText(true, '23/08/2026 15:00', true)).toBe('Refreshing...');
    expect(freshnessText(true, '23/08/2026 15:00', false)).toBe('23/08/2026 15:00');
    expect(freshnessText(false, null, false)).toBe('Unknown');
  });
});
