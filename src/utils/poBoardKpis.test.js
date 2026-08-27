import { describe, it, expect } from 'vitest';
import { aggregatePoBoardKpisFromByOrder, buildKpiQtyOverlay, overlayKpiQtyOnOrders } from './poBoardKpis';

describe('aggregatePoBoardKpisFromByOrder', () => {
  const payload = {
    sku: ['SKU-1', 'SKU-2', 'SKU-3', 'HIDDEN'],
    orders: {
      'PO-A': {
        o: 10, d: 4, oi: [0], ls: 14, ln: 1, lu: 4, lk: [0, 1], tu: 2, tk: [1], os: 7, on: 1, ou: 10, ok: [0], yu: 8, yk: [0],
      },
      'PO-B': { o: 3, oi: [2], os: 2, on: 1, ou: 3, ok: [2] },
      'PO-C': { o: 99, d: 99, ls: 1, ln: 1, lk: [3] },
    },
  };

  it('sums only the visible purchase orders', () => {
    const { kpis, matchByKey } = aggregatePoBoardKpisFromByOrder(payload, ['PO-A', 'PO-B']);
    expect(kpis.totalOpen).toBe(13);
    expect(kpis.totalDelivered).toBe(4);
    expect(kpis.totalOrdered).toBe(17);
    expect(kpis.openItemCount).toBe(2);
    expect(kpis.capacityShortfall).toBeNull();
    expect(kpis.overloadedWeeks).toBeNull();
    expect(matchByKey.ordered.has('PO-A')).toBe(true);
    expect(matchByKey.ordered.has('PO-C')).toBe(false);
  });

  it('uniques late SKUs and averages days across visible orders', () => {
    const { kpis, matchByKey } = aggregatePoBoardKpisFromByOrder(payload, ['PO-A', 'PO-B']);
    expect(kpis.lateDeliveryAvgDays).toBe(14);
    expect(kpis.lateDeliveryItemCount).toBe(2);
    expect(kpis.lateDeliveryUnits).toBe(4);
    expect(kpis.lateDeliveryPercent).toBeCloseTo(4 / 17 * 100);
    expect(kpis.onTimeItemCount).toBe(1);
    expect(kpis.onTimeUnits).toBe(2);
    expect(kpis.onTimePercent).toBeCloseTo(2 / 17 * 100);
    expect(kpis.openLateItemCount).toBe(2);
    expect(kpis.openLateUnits).toBe(13);
    expect(kpis.openLateAvgDays).toBeCloseTo(4.5);
    expect(matchByKey.lateItems.has('PO-A')).toBe(true);
    expect(matchByKey.onTime.has('PO-A')).toBe(true);
    expect(matchByKey.openLate.has('PO-B')).toBe(true);
    expect(kpis.planned1900Units).toBe(8);
    expect(kpis.planned1900ItemCount).toBe(1);
    expect(matchByKey.planned1900.has('PO-A')).toBe(true);
    expect(matchByKey.planned1900.has('PO-B')).toBe(false);
    expect(kpis.validPlannedUnits).toBe(9);
    expect(kpis.validPlannedPercent).toBeCloseTo(9 / 17 * 100);
    expect(kpis.deliveryReliabilityPercent).toBeCloseTo(2 / 4 * 100);
    expect(matchByKey.validDates.has('PO-A')).toBe(true);
    expect(matchByKey.validDates.has('PO-B')).toBe(false);
    expect(matchByKey.deliveryReliability.has('PO-A')).toBe(true);
    expect(matchByKey.deliveryReliability.has('PO-B')).toBe(false);
  });

  it('ignores order numbers that are not in the snapshot map', () => {
    const { kpis } = aggregatePoBoardKpisFromByOrder(payload, ['PO-MISSING']);
    expect(kpis.totalOrdered).toBe(0);
    expect(kpis.lateDeliveryAvgDays).toBeNull();
  });

  it('overlays on-time units onto received columns, not ordered columns', () => {
    const orders = [{
      orderNumber: 'WSPO-0071489',
      values: {
        received_qty_ontvangstregels_total_3: 1453,
        ordered_qty_ontvangstregels_total: 1453,
        remaining_qty_ontvangstregels_total_2: 0,
      },
    }];
    const overlay = { 'WSPO-0071489': 1 };
    const next = overlayKpiQtyOnOrders(orders, overlay, 'onTime');
    expect(next[0].values.received_qty_ontvangstregels_total_3).toBe(1);
    expect(next[0].values.ordered_qty_ontvangstregels_total).toBe(1453);
    expect(next[0].values.remaining_qty_ontvangstregels_total_2).toBe(0);
  });

  it('builds a validDates overlay from 1-1-1900 units', () => {
    const overlay = buildKpiQtyOverlay(payload, ['PO-A', 'PO-B'], 'validDates');
    expect(overlay['PO-A']).toBe(8);
    expect(overlay['PO-B']).toBe(0);
  });

  it('overlays valid-dates filter onto ordered columns using 1-1-1900 units', () => {
    const orders = [{
      orderNumber: 'PO-A',
      values: {
        ordered_qty_ontvangstregels_total: 14,
        received_qty_ontvangstregels_total_3: 4,
      },
    }];
    const overlay = { 'PO-A': 8 };
    const next = overlayKpiQtyOnOrders(orders, overlay, 'validDates');
    expect(next[0].values.ordered_qty_ontvangstregels_total).toBe(8);
    expect(next[0].values.received_qty_ontvangstregels_total_3).toBe(4);
  });
});
