import { describe, expect, it } from 'vitest';
import {
  formatColumnUniqueValue,
  formatPurchStatusDisplay,
  isPurchaseOrderStatusColumn,
  toPurchStatusStoredValue,
} from './purchStatusDisplay';

describe('purchStatusDisplay', () => {
  it('herkent de D365 purchase-order statuskolom', () => {
    expect(isPurchaseOrderStatusColumn({ d365Field: 'PurchaseOrderStatus' })).toBe(true);
    expect(isPurchaseOrderStatusColumn({ key: 'status' })).toBe(true);
    expect(isPurchaseOrderStatusColumn({ columnKey: 'purchaseOrderStatus' })).toBe(true);
    expect(isPurchaseOrderStatusColumn({ key: 'vendorAccount' })).toBe(false);
  });

  it('toont Backorder als Open order, andere waarden ongewijzigd', () => {
    expect(formatPurchStatusDisplay('Backorder')).toBe('Open order');
    expect(formatPurchStatusDisplay('backorder')).toBe('Open order');
    expect(formatPurchStatusDisplay('Invoiced')).toBe('Invoiced');
    expect(formatPurchStatusDisplay('Canceled')).toBe('Canceled');
    expect(formatPurchStatusDisplay('')).toBe('');
  });

  it('zet het D365-schermlabel terug naar de opgeslagen enum-waarde', () => {
    expect(toPurchStatusStoredValue('Open order')).toBe('Backorder');
    expect(toPurchStatusStoredValue('Backorder')).toBe('Backorder');
    expect(toPurchStatusStoredValue('Invoiced')).toBe('Invoiced');
  });

  it('formatteert unieke filterwaarden alleen voor de statuskolom', () => {
    expect(formatColumnUniqueValue({ d365Field: 'PurchaseOrderStatus' }, 'Backorder')).toBe('Open order');
    expect(formatColumnUniqueValue({ key: 'vendor' }, 'Backorder')).toBe('Backorder');
  });
});
