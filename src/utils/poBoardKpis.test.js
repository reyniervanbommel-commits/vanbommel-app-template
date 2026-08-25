import { describe, it, expect } from 'vitest';
import { aggregatePoBoardKpisFromByOrder } from './poBoardKpis';

describe('aggregatePoBoardKpisFromByOrder', () => {
  const byOrder = {
    'PO-A': {
      openQty: 10,
      deliveredQty: 4,
      lateDays: [14],
      lateSkus: ['SKU-1', 'SKU-2'],
      openLateDays: [7],
      openLateSkus: ['SKU-1'],
    },
    'PO-B': {
      openQty: 3,
      deliveredQty: 0,
      lateDays: [],
      lateSkus: [],
      openLateDays: [2],
      openLateSkus: ['SKU-3'],
    },
    'PO-C': {
      openQty: 99,
      deliveredQty: 99,
      lateDays: [1],
      lateSkus: ['HIDDEN'],
      openLateDays: [],
      openLateSkus: [],
    },
  };

  it('sums only the visible purchase orders', () => {
    const { kpis, matchByKey } = aggregatePoBoardKpisFromByOrder(byOrder, ['PO-A', 'PO-B']);
    expect(kpis.totalOpen).toBe(13);
    expect(kpis.totalDelivered).toBe(4);
    expect(kpis.totalOrdered).toBe(17);
    expect(kpis.capacityShortfall).toBeNull();
    expect(kpis.overloadedWeeks).toBeNull();
    expect(matchByKey.ordered.has('PO-A')).toBe(true);
    expect(matchByKey.ordered.has('PO-C')).toBe(false);
  });

  it('uniques late SKUs and averages days across visible orders', () => {
    const { kpis, matchByKey } = aggregatePoBoardKpisFromByOrder(byOrder, ['PO-A', 'PO-B']);
    expect(kpis.lateDeliveryAvgDays).toBe(14);
    expect(kpis.lateDeliveryItemCount).toBe(2);
    expect(kpis.openLateItemCount).toBe(2);
    expect(kpis.openLateAvgDays).toBeCloseTo(4.5);
    expect(matchByKey.lateItems.has('PO-A')).toBe(true);
    expect(matchByKey.openLate.has('PO-B')).toBe(true);
  });

  it('ignores order numbers that are not in the snapshot map', () => {
    const { kpis } = aggregatePoBoardKpisFromByOrder(byOrder, ['PO-MISSING']);
    expect(kpis.totalOrdered).toBe(0);
    expect(kpis.lateDeliveryAvgDays).toBeNull();
  });
});
