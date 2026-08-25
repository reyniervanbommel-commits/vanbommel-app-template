import { describe, it, expect } from 'vitest';
import { buildPoBoardKpis, calendarDaysBetween } from './poBoardKpis';

describe('buildPoBoardKpis', () => {
  const planned = '2026-03-16T00:00:00.000Z';
  const received = '2026-03-30T00:00:00.000Z';
  const config = {
    openMeasureKey: 'openQty',
    deliveredMeasureKey: 'deliveredQty',
    dateColumnKey: 'requestedDeliveryDate',
    receiptDateColumnKey: 'productReceiptDate',
    excludedStatuses: ['Canceled'],
  };

  function order(overrides = {}) {
    return {
      orderNumber: overrides.orderNumber || 'PO-A',
      values: {
        openQty: 10,
        deliveredQty: 4,
        requestedDeliveryDate: planned,
        productReceiptDate: received,
        itemNumber: 'SKU-1',
        status: 'Open',
        ...(overrides.values || {}),
      },
      linkedLineValues: overrides.linkedLineValues,
    };
  }

  it('sums open and delivered from visible header rows', () => {
    const { kpis, matchByKey } = buildPoBoardKpis([order()], config, { now: new Date(planned) });
    expect(kpis.totalOrdered).toBe(14);
    expect(kpis.totalDelivered).toBe(4);
    expect(kpis.totalOpen).toBe(10);
    expect(kpis.capacityShortfall).toBeNull();
    expect(matchByKey.ordered.has('PO-A')).toBe(true);
  });

  it('counts late received days and unique SKUs including linked line items', () => {
    const { kpis, matchByKey } = buildPoBoardKpis([
      order({ linkedLineValues: { itemNumber: ['SKU-1', 'SKU-2'] } }),
    ], config, { now: new Date(planned) });
    expect(kpis.lateDeliveryAvgDays).toBe(calendarDaysBetween(received, planned));
    expect(kpis.lateDeliveryItemCount).toBe(2);
    expect(matchByKey.lateItems.has('PO-A')).toBe(true);
  });

  it('marks open-and-late when the planned week is before now', () => {
    const { kpis, matchByKey } = buildPoBoardKpis(
      [order()],
      config,
      { now: new Date('2026-03-23T00:00:00.000Z') },
    );
    expect(kpis.openLateItemCount).toBe(1);
    expect(matchByKey.openLate.has('PO-A')).toBe(true);
  });

  it('skips excluded statuses and does not apply a week window', () => {
    const canceled = order({ orderNumber: 'PO-X', values: { status: 'Canceled' } });
    const { kpis } = buildPoBoardKpis([order(), canceled], config, { now: new Date(planned) });
    expect(kpis.totalOrdered).toBe(14);
  });
});
