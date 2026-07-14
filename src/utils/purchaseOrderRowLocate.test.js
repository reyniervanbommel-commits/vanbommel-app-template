import { describe, expect, it } from 'vitest';
import {
  findOrderGroupContext,
  orderLocateKeyFromOrder,
  orderLocateKeyFromPanelRow,
} from './purchaseOrderRowLocate';

describe('purchaseOrderRowLocate', () => {
  it('bouwt een stabiele locate key vanuit panel- en orderdata', () => {
    expect(orderLocateKeyFromPanelRow({ partitionKey: 'USMF', recordKey: 'PO-1' })).toBe('USMF|PO-1');
    expect(orderLocateKeyFromOrder({ dataAreaId: 'USMF', orderNumber: 'PO-1' })).toBe('USMF|PO-1');
  });

  it('vindt de leaf group en ancestor keys voor een order', () => {
    const groupedRows = [
      {
        groupKey: 'status:Open',
        ancestorGroupKeys: [],
        entries: [],
      },
      {
        groupKey: 'status:Open||vendor:Acme',
        ancestorGroupKeys: ['status:Open'],
        entries: [{ order: { dataAreaId: 'USMF', orderNumber: 'PO-99' } }],
      },
    ];

    expect(findOrderGroupContext(groupedRows, 'USMF|PO-99')).toEqual({
      keysToExpand: ['status:Open', 'status:Open||vendor:Acme'],
    });
  });
});
