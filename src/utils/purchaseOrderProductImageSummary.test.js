import { describe, expect, it } from 'vitest';
import { getPurchaseOrderProductImageSummary } from './purchaseOrderProductImageSummary';

describe('getPurchaseOrderProductImageSummary', () => {
  it('selects the first visible item and counts following unique item numbers', () => {
    expect(getPurchaseOrderProductImageSummary([
      { values: { itemNumber: 'ITEM-1' } },
      { values: { itemNumber: 'ITEM-1' } },
      { values: { itemNumber: 'ITEM-2' } },
    ])).toEqual({
      firstItemNumber: 'ITEM-1',
      additionalItemCount: 1,
    });
  });

  it('excludes removed and empty item numbers while preserving line order', () => {
    expect(getPurchaseOrderProductImageSummary([
      { values: { itemNumber: 'REMOVED' }, isRemoved: true },
      { values: { itemNumber: '  ' } },
      { itemNumber: 'ITEM-2' },
      { values: { itemNumber: 'ITEM-1' } },
    ])).toEqual({
      firstItemNumber: 'ITEM-2',
      additionalItemCount: 1,
    });
  });

  it('returns an empty summary when no visible item exists', () => {
    expect(getPurchaseOrderProductImageSummary(null)).toEqual({
      firstItemNumber: '',
      additionalItemCount: 0,
    });
  });
});
