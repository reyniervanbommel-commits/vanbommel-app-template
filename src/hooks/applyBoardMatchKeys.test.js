import { describe, expect, it } from 'vitest';
import { rowKey } from '../components/supplier/remarks/remarksFormatters';
import { applyBoardMatchKeys } from './applyBoardMatchKeys';

const ITEMS = [
  { dataAreaId: 'nl', orderNumber: 'PO-1' },
  { dataAreaId: 'nl', orderNumber: 'PO-2' },
  { dataAreaId: 'be', orderNumber: 'PO-1' },
];

describe('applyBoardMatchKeys', () => {
  it('returns all processedItems when remarks filter is off', () => {
    const result = applyBoardMatchKeys({
      processedItems: ITEMS,
      remarksFilterEnabled: false,
      remarksMatchKeys: null,
      kpiMatchKeys: null,
      kpiFilterKey: null,
      kpiQtyOverlay: { ignored: true },
    });

    expect(result.columnFiltered).toEqual(ITEMS);
    expect(result.displayedItems).toEqual(ITEMS);
  });

  it('returns an empty columnFiltered set while remarks keys are still loading', () => {
    const result = applyBoardMatchKeys({
      processedItems: ITEMS,
      remarksFilterEnabled: true,
      remarksMatchKeys: null,
      kpiMatchKeys: null,
      kpiFilterKey: null,
      kpiQtyOverlay: null,
    });

    expect(result.columnFiltered).toEqual([]);
    expect(result.displayedItems).toEqual([]);
  });

  it('filters remarks by rowKey then applies KPI on orderNumber', () => {
    const result = applyBoardMatchKeys({
      processedItems: ITEMS,
      remarksFilterEnabled: true,
      remarksMatchKeys: new Set([rowKey('nl', 'PO-1'), rowKey('nl', 'PO-2')]),
      kpiMatchKeys: new Set(['PO-1']),
      kpiFilterKey: 'open',
      kpiQtyOverlay: { ignored: true },
    });

    expect(result.columnFiltered.map((order) => `${order.dataAreaId}:${order.orderNumber}`))
      .toEqual(['nl:PO-1', 'nl:PO-2']);
    expect(result.displayedItems.map((order) => `${order.dataAreaId}:${order.orderNumber}`))
      .toEqual(['nl:PO-1']);
  });
});
