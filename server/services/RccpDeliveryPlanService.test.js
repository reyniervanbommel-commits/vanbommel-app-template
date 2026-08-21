'use strict';

const {
  mapPoLine, mapSnapshotRows, sumWeeklyCapacity,
} = require('./RccpDeliveryPlanService');
const { isoWeekKey, getIsoWeek, getIsoWeekYear } = require('../utils/isoWeek');

const config = {
  vendorColumnKey: 'vendorAccount',
  excludedStatuses: ['Canceled'],
  deliveryPlanPlannedDateKey: 'requestedDeliveryDate',
  deliveryPlanDeliveredDateKey: 'productReceiptDate',
  deliveryPlanOrderedQtyKey: 'quantity',
  deliveryPlanDeliveredQtyKey: 'receivedPurchaseQuantity',
};

describe('RccpDeliveryPlanService mapping', () => {
  it('computes openQty as max(0, ordered - delivered) and never overwrites plannedDate', () => {
    const mapped = mapPoLine({
      recordKey: 'PO-1',
      masterValues: { purchaseOrderNumber: 'PO-1' },
      lineValues: {
        requestedDeliveryDate: '2026-03-10',
        productReceiptDate: '2026-03-24',
        quantity: 10,
        receivedPurchaseQuantity: 12,
      },
      lineNumber: '2',
      share: 1,
      config,
    });
    expect(mapped.openQty).toBe(0);
    expect(mapped.orderedQty).toBe(10);
    expect(mapped.deliveredQty).toBe(12);
    expect(mapped.plannedDate).toBe('2026-03-10');
    expect(mapped.orderId).toBe('PO-1|2');
    expect(mapped.delayWeeks).toBe(2);
  });

  it('skips a line without plannedDate', () => {
    expect(mapPoLine({
      recordKey: 'rk-9',
      masterValues: {},
      lineValues: { productReceiptDate: '2026-03-10', quantity: 4 },
      lineNumber: '1',
      share: 1,
      config,
    })).toBeNull();
  });

  it('treats empty delivered date or qty as not delivered', () => {
    const noDate = mapPoLine({
      recordKey: 'rk-1',
      masterValues: { purchaseOrderNumber: 'PO-2' },
      lineValues: { requestedDeliveryDate: '2026-03-10', quantity: 8 },
      lineNumber: '1',
      share: 1,
      config,
    });
    expect(noDate.deliveredDate).toBeNull();
    expect(noDate.deliveredQty).toBe(0);
    expect(noDate.openQty).toBe(8);
    expect(noDate.delayWeeks).toBeNull();

    const zeroQty = mapPoLine({
      recordKey: 'rk-1',
      masterValues: { purchaseOrderNumber: 'PO-2' },
      lineValues: {
        requestedDeliveryDate: '2026-03-10',
        productReceiptDate: '2026-03-17',
        quantity: 8,
        receivedPurchaseQuantity: 0,
      },
      lineNumber: '1',
      share: 1,
      config,
    });
    expect(zeroQty.deliveredDate).toBeNull();
    expect(zeroQty.deliveredQty).toBe(0);
  });

  it('uses recordKey when purchaseOrderNumber is missing', () => {
    const mapped = mapPoLine({
      recordKey: 'ROW-77',
      masterValues: {},
      lineValues: { requestedDeliveryDate: '2026-03-10', quantity: 3 },
      lineNumber: '4',
      share: 1,
      config,
    });
    expect(mapped.orderId).toBe('ROW-77|4');
  });

  it('keeps late receipts whose planned week is outside the window', () => {
    const planned = '2026-01-06'; // ISO 2026-W02
    const delivered = '2026-03-10'; // later week
    const year = getIsoWeekYear(delivered);
    const week = getIsoWeek(delivered);
    const window = { fromYear: year, fromWeek: week, toYear: year, toWeek: week };
    const orders = mapSnapshotRows([{
      recordKey: 'PO-9',
      values: { vendorAccount: 'V1', purchaseOrderNumber: 'PO-9' },
      details: [{
        detailKey: '1',
        values: {
          requestedDeliveryDate: planned,
          productReceiptDate: delivered,
          quantity: 5,
          receivedPurchaseQuantity: 5,
        },
      }],
    }], config, window, 'V1');
    expect(orders).toHaveLength(1);
    expect(orders[0].plannedDate).toBe(planned);
  });

  it('excludes canceled lines and other vendors', () => {
    const date = '2026-03-10';
    const year = getIsoWeekYear(date);
    const week = getIsoWeek(date);
    const window = { fromYear: year, fromWeek: week, toYear: year, toWeek: week };
    const orders = mapSnapshotRows([
      {
        recordKey: 'PO-A',
        values: { vendorAccount: 'V1', purchaseOrderNumber: 'PO-A', status: 'Canceled' },
        details: [{ detailKey: '1', values: { requestedDeliveryDate: date, quantity: 2 } }],
      },
      {
        recordKey: 'PO-B',
        values: { vendorAccount: 'V2', purchaseOrderNumber: 'PO-B' },
        details: [{ detailKey: '1', values: { requestedDeliveryDate: date, quantity: 2 } }],
      },
    ], config, window, 'V1');
    expect(orders).toHaveLength(0);
  });
});

describe('RccpDeliveryPlanService capacity', () => {
  it('sums availableQty per vendor ISO week and omits weeks without a row', () => {
    const window = { fromYear: 2026, fromWeek: 10, toYear: 2026, toWeek: 12 };
    const totals = sumWeeklyCapacity([
      { periodYear: 2026, isoWeek: 10, availableQty: 40 },
      { periodYear: 2026, isoWeek: 10, availableQty: 10 },
      { periodYear: 2026, isoWeek: 12, availableQty: 7 },
    ], window);
    expect(totals[isoWeekKey(2026, 10)]).toBe(50);
    expect(totals[isoWeekKey(2026, 11)]).toBeUndefined();
    expect(totals[isoWeekKey(2026, 12)]).toBe(7);
  });
});
