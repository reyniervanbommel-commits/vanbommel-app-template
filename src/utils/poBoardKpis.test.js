import { describe, it, expect } from 'vitest';
import { aggregatePoBoardKpisFromByOrder } from './poBoardKpis';

describe('aggregatePoBoardKpisFromByOrder', () => {
  const payload = {
    sku: ['SKU-1', 'SKU-2', 'SKU-3', 'HIDDEN'],
    orders: {
      'PO-A': { o: 10, d: 4, ls: 14, ln: 1, lk: [0, 1], os: 7, on: 1, ok: [0] },
      'PO-B': { o: 3, os: 2, on: 1, ok: [2] },
      'PO-C': { o: 99, d: 99, ls: 1, ln: 1, lk: [3] },
    },
  };

  it('sums only the visible purchase orders', () => {
    const { kpis, matchByKey } = aggregatePoBoardKpisFromByOrder(payload, ['PO-A', 'PO-B']);
    expect(kpis.totalOpen).toBe(13);
    expect(kpis.totalDelivered).toBe(4);
    expect(kpis.totalOrdered).toBe(17);
    expect(kpis.capacityShortfall).toBeNull();
    expect(kpis.overloadedWeeks).toBeNull();
    expect(matchByKey.ordered.has('PO-A')).toBe(true);
    expect(matchByKey.ordered.has('PO-C')).toBe(false);
  });

  it('uniques late SKUs and averages days across visible orders', () => {
    const { kpis, matchByKey } = aggregatePoBoardKpisFromByOrder(payload, ['PO-A', 'PO-B']);
    expect(kpis.lateDeliveryAvgDays).toBe(14);
    expect(kpis.lateDeliveryItemCount).toBe(2);
    expect(kpis.openLateItemCount).toBe(2);
    expect(kpis.openLateAvgDays).toBeCloseTo(4.5);
    expect(matchByKey.lateItems.has('PO-A')).toBe(true);
    expect(matchByKey.openLate.has('PO-B')).toBe(true);
  });

  it('ignores order numbers that are not in the snapshot map', () => {
    const { kpis } = aggregatePoBoardKpisFromByOrder(payload, ['PO-MISSING']);
    expect(kpis.totalOrdered).toBe(0);
    expect(kpis.lateDeliveryAvgDays).toBeNull();
  });
});
