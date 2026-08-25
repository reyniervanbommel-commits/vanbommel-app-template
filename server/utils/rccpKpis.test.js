'use strict';

const { getIsoWeek, getIsoWeekYear, isoWeekKey } = require('./isoWeek');
const { buildRccpPoKpis, buildRccpPoKpiByOrder, buildRccpCapacityKpis, calendarDaysBetween } = require('./rccpKpis');

function weekOf(date) {
  return {
    year: getIsoWeekYear(date),
    week: getIsoWeek(date),
    key: isoWeekKey(getIsoWeekYear(date), getIsoWeek(date)),
  };
}

describe('rccpKpis', () => {
  const planned = '2026-03-16T00:00:00.000Z';
  const received = '2026-03-30T00:00:00.000Z';
  const plannedWeek = weekOf(planned);
  const receivedWeek = weekOf(received);
  const nowCurrent = new Date(planned);
  const nowNext = new Date('2026-03-23T00:00:00.000Z');

  const baseConfig = {
    dateColumnKey: 'requestedDeliveryDate',
    receiptDateColumnKey: 'productReceiptDate',
    vendorColumnKey: 'vendorAccount',
    openMeasureKey: 'openQty',
    deliveredMeasureKey: 'deliveredQty',
    excludedStatuses: ['Canceled'],
  };

  const window = {
    fromYear: plannedWeek.year,
    fromWeek: Math.min(plannedWeek.week, receivedWeek.week),
    toYear: receivedWeek.year,
    toWeek: Math.max(plannedWeek.week, receivedWeek.week),
  };

  function row(overrides = {}) {
    return {
      recordKey: 'PO-A',
      values: { vendorAccount: 'V001', status: 'Open', ...(overrides.values || {}) },
      details: overrides.details || [{
        detailKey: '1',
        values: {
          requestedDeliveryDate: planned,
          productReceiptDate: received,
          openQty: 10,
          deliveredQty: 4,
          itemNumber: 'SKU-1',
          ...(overrides.line || {}),
        },
      }],
    };
  }

  it('counts ordered from planned-week lines and delivered even when receipt is later', () => {
    const kpis = buildRccpPoKpis([row()], baseConfig, window, { now: nowCurrent, vendorAccount: 'V001' });
    expect(kpis.totalOpen).toBe(10);
    expect(kpis.totalDelivered).toBe(4);
    expect(kpis.totalOrdered).toBe(14);
    expect(kpis.deliveredPercent).toBeCloseTo(4 / 14 * 100);
    expect(kpis.openPercent).toBeCloseTo(10 / 14 * 100);
  });

  it('includes delivered of in-window planned lines when receipt week is outside the range', () => {
    const plannedOnly = {
      fromYear: plannedWeek.year,
      fromWeek: plannedWeek.week,
      toYear: plannedWeek.year,
      toWeek: plannedWeek.week,
    };
    const kpis = buildRccpPoKpis([row()], baseConfig, plannedOnly, { now: nowCurrent, vendorAccount: 'V001' });
    expect(kpis.totalDelivered).toBe(4);
    expect(kpis.totalOrdered).toBe(14);
  });

  it('counts late received days and unique SKUs', () => {
    const kpis = buildRccpPoKpis([row()], baseConfig, window, { now: nowCurrent, vendorAccount: 'V001' });
    expect(kpis.lateDeliveryAvgDays).toBe(calendarDaysBetween(received, planned));
    expect(kpis.lateDeliveryItemCount).toBe(1);
    expect(kpis.lateDeliveryUnits).toBe(4);
    expect(kpis.openItemCount).toBe(1);
    expect(kpis.lateDeliveryPercent).toBeCloseTo(4 / 14 * 100);
    expect(kpis.onTimeItemCount).toBe(0);
    expect(kpis.onTimeUnits).toBe(0);
  });

  it('does not count same-day receipt as late', () => {
    const kpis = buildRccpPoKpis(
      [row({ line: { productReceiptDate: planned } })],
      baseConfig,
      window,
      { now: nowCurrent, vendorAccount: 'V001' },
    );
    expect(kpis.lateDeliveryItemCount).toBe(0);
    expect(kpis.lateDeliveryAvgDays).toBeNull();
    expect(kpis.onTimeItemCount).toBe(1);
    expect(kpis.onTimeUnits).toBe(4);
    expect(kpis.onTimePercent).toBeCloseTo(4 / 14 * 100);
  });

  it('counts unique SKUs once and averages late days per line', () => {
    const rows = [row(), {
      recordKey: 'PO-B',
      values: { vendorAccount: 'V001', status: 'Open' },
      details: [{
        detailKey: '1',
        values: {
          requestedDeliveryDate: planned,
          productReceiptDate: received,
          openQty: 0,
          deliveredQty: 2,
          itemNumber: 'SKU-1',
        },
      }, {
        detailKey: '2',
        values: {
          requestedDeliveryDate: planned,
          productReceiptDate: '2026-03-23T00:00:00.000Z',
          openQty: 0,
          deliveredQty: 2,
          itemNumber: 'SKU-2',
        },
      }],
    }];
    const kpis = buildRccpPoKpis(rows, baseConfig, window, { now: nowCurrent, vendorAccount: 'V001' });
    expect(kpis.lateDeliveryItemCount).toBe(2);
    const d1 = calendarDaysBetween(received, planned);
    const d2 = calendarDaysBetween('2026-03-23T00:00:00.000Z', planned);
    expect(kpis.lateDeliveryAvgDays).toBeCloseTo((d1 + d1 + d2) / 3);
    expect(kpis.lateDeliveryUnits).toBe(8);
  });

  it('marks open-and-late after the planned week and skips empty item numbers', () => {
    const kpis = buildRccpPoKpis(
      [row({ line: { itemNumber: '' } })],
      baseConfig,
      window,
      { now: nowNext, vendorAccount: 'V001' },
    );
    expect(kpis.openLateItemCount).toBe(0);
    expect(kpis.openLateAvgDays).toBe(calendarDaysBetween(nowNext, planned));
  });

  it('counts open-and-late unique SKUs when still open and planned week is past', () => {
    const kpis = buildRccpPoKpis([row()], baseConfig, window, { now: nowNext, vendorAccount: 'V001' });
    expect(kpis.openLateItemCount).toBe(1);
    expect(kpis.openLateAvgDays).toBe(calendarDaysBetween(nowNext, planned));
  });

  it('ignores other vendors and excluded statuses', () => {
    const other = row({ values: { vendorAccount: 'V999' } });
    const canceled = row({ line: { status: 'Canceled', itemNumber: 'SKU-X' } });
    const kpis = buildRccpPoKpis([row(), other, canceled], baseConfig, window, {
      now: nowCurrent,
      vendorAccount: 'V001',
    });
    expect(kpis.totalOrdered).toBe(14);
    expect(kpis.lateDeliveryItemCount).toBe(1);
  });

  it('builds per-order stats without the week window', () => {
    const outOfWindow = {
      recordKey: 'PO-FAR',
      values: { vendorAccount: 'V001', status: 'Open' },
      details: [{
        detailKey: '1',
        values: {
          requestedDeliveryDate: '2025-01-06T00:00:00.000Z',
          productReceiptDate: '2025-01-20T00:00:00.000Z',
          openQty: 5,
          deliveredQty: 2,
          itemNumber: 'SKU-9',
        },
      }],
    };
    const windowed = buildRccpPoKpis([row(), outOfWindow], baseConfig, window, {
      now: nowCurrent,
      vendorAccount: 'V001',
    });
    expect(windowed.totalOrdered).toBe(14);

    const all = buildRccpPoKpis([row(), outOfWindow], baseConfig, window, {
      now: nowCurrent,
      vendorAccount: 'V001',
      skipWindow: true,
    });
    expect(all.totalOrdered).toBe(21);

    const byOrder = buildRccpPoKpiByOrder([row(), outOfWindow], baseConfig, {
      now: nowNext,
      vendorAccount: 'V001',
    });
    expect(byOrder.orders['PO-A'].o).toBe(10);
    expect(byOrder.orders['PO-A'].d).toBe(4);
    expect(byOrder.orders['PO-A'].ln).toBe(1);
    expect(byOrder.orders['PO-A'].ls).toBe(calendarDaysBetween(received, planned));
    expect(byOrder.orders['PO-A'].lu).toBe(4);
    expect(byOrder.orders['PO-A'].oi).toEqual(expect.any(Array));
    expect(byOrder.orders['PO-FAR'].o).toBe(5);
    expect(byOrder.orders['PO-FAR'].d).toBe(2);
    expect(byOrder.orders['PO-FAR'].on).toBe(1);
    expect(byOrder.orders['PO-FAR'].lu).toBe(2);
    expect(byOrder.sku).toContain('SKU-9');
  });

  it('sums capacity shortfall and overloaded weeks from open load', () => {
    const chart = [
      { key: '2026-W11', openQty: 80, deliveredQty: -40, __capacity__: 100 },
      { key: '2026-W12', openQty: 120, deliveredQty: -10, __capacity__: 100 },
      { key: '2026-W13', openQty: 50, deliveredQty: 0, __capacity__: 0 },
    ];
    const measureRows = [
      { measureKey: 'openQty', isDelivered: false },
      { measureKey: 'deliveredQty', isDelivered: true },
      { measureKey: '__capacity__', isCapacity: true },
    ];
    const kpis = buildRccpCapacityKpis(chart, measureRows, '__capacity__');
    expect(kpis.capacityShortfall).toBe(70);
    expect(kpis.overloadedWeeks).toBe(2);
  });
});
