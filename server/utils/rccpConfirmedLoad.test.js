'use strict';

const { getIsoWeek, getIsoWeekYear, isoWeekKey } = require('./isoWeek');
const {
  CONFIRMED_DELIVERY_MEASURE_KEY,
  REQUESTED_DELIVERY_MEASURE_KEY,
  buildFactoryConfirmedByCell,
  buildConfirmedDeliveryCells,
  appendConfirmedDeliveryRow,
  appendRequestedDeliveryRow,
  matchConfirmedDeliveryDrill,
  matchRequestedDeliveryDrill,
  openLoadForOvercapacity,
} = require('./rccpConfirmedLoad');
const { buildRccpCapacityKpis } = require('./rccpKpis');

function weekOf(date) {
  return {
    year: getIsoWeekYear(date),
    week: getIsoWeek(date),
    key: isoWeekKey(getIsoWeekYear(date), getIsoWeek(date)),
  };
}

describe('rccpConfirmedLoad', () => {
  const planned = '2026-03-16T00:00:00.000Z';
  const confirmed = '2026-03-23T00:00:00.000Z';
  const plannedWeek = weekOf(planned);
  const confirmedWeek = weekOf(confirmed);

  const baseConfig = {
    dateColumnKey: 'requestedDeliveryDate',
    receiptDateColumnKey: 'productReceiptDate',
    confirmedDateColumnKey: 'confirmedDlvDate',
    vendorColumnKey: 'vendorAccount',
    openMeasureKey: 'openQty',
    deliveredMeasureKey: 'deliveredQty',
    excludedStatuses: ['Canceled'],
  };

  const window = {
    fromYear: plannedWeek.year,
    fromWeek: plannedWeek.week,
    toYear: confirmedWeek.year,
    toWeek: confirmedWeek.week,
  };

  function row(overrides = {}) {
    return {
      recordKey: 'PO-A',
      partitionKey: 'whsl',
      values: { vendorAccount: 'V001', status: 'Open', dataAreaId: 'whsl', ...(overrides.values || {}) },
      details: overrides.details || [{
        detailKey: '1',
        values: {
          requestedDeliveryDate: planned,
          confirmedDlvDate: confirmed,
          openQty: 10,
          deliveredQty: 4,
          itemNumber: 'SKU-1',
          ...(overrides.line || {}),
        },
      }],
    };
  }

  it('builds extra row cells with Confirmed delivery measure', () => {
    const factoryConfirmedByCell = new Map([[`V001|${confirmedWeek.year}|${confirmedWeek.week}`, 10]]);
    const periods = [{ year: confirmedWeek.year, week: confirmedWeek.week, key: confirmedWeek.key }];
    const { cells, measureRow } = buildConfirmedDeliveryCells({
      factoryConfirmedByCell,
      periods,
      vendorFilter: 'V001',
      config: baseConfig,
    });
    expect(measureRow).toEqual({
      measureKey: CONFIRMED_DELIVERY_MEASURE_KEY,
      label: 'Confirmed delivery',
      showInChart: false,
      isConfirmedDelivery: true,
    });
    expect(cells).toEqual([
      expect.objectContaining({
        vendorAccount: 'V001',
        periodYear: confirmedWeek.year,
        isoWeek: confirmedWeek.week,
        measureKey: CONFIRMED_DELIVERY_MEASURE_KEY,
        confirmedQty: 10,
      }),
    ]);
  });

  it('appends a Requested delivery row on the requested week', () => {
    const cells = [];
    const measureRows = [];
    appendRequestedDeliveryRow({
      cells,
      measureRows,
      confirmedByCell: new Map([
        [`V001|${plannedWeek.year}|${plannedWeek.week}|openQty`, 10],
        [`V001|${confirmedWeek.year}|${confirmedWeek.week}|openQty`, 0],
      ]),
      openMeasureKey: 'openQty',
      periods: [
        { year: plannedWeek.year, week: plannedWeek.week, key: plannedWeek.key },
        { year: confirmedWeek.year, week: confirmedWeek.week, key: confirmedWeek.key },
      ],
      vendorFilter: 'V001',
    });
    expect(measureRows).toEqual([
      expect.objectContaining({
        measureKey: REQUESTED_DELIVERY_MEASURE_KEY,
        label: 'Requested delivery',
        showInChart: false,
        isRequestedDelivery: true,
      }),
    ]);
    expect(cells).toEqual([
      expect.objectContaining({
        measureKey: REQUESTED_DELIVERY_MEASURE_KEY,
        periodYear: plannedWeek.year,
        isoWeek: plannedWeek.week,
        confirmedQty: 10,
      }),
      expect.objectContaining({
        measureKey: REQUESTED_DELIVERY_MEASURE_KEY,
        periodYear: confirmedWeek.year,
        isoWeek: confirmedWeek.week,
        confirmedQty: 0,
      }),
    ]);
  });

  it('matches requested-delivery drill on the requested week', () => {
    const onRequested = matchRequestedDeliveryDrill(row(), {
      vendorAccount: 'V001',
      periodYear: plannedWeek.year,
      isoWeek: plannedWeek.week,
      measureKey: '__requested_delivery__',
    }, baseConfig, window);
    expect(onRequested).toEqual([
      expect.objectContaining({
        orderNumber: 'PO-A',
        itemNumber: 'SKU-1',
        quantity: 10,
        deliveryDate: planned,
      }),
    ]);
    const onConfirmed = matchRequestedDeliveryDrill(row(), {
      vendorAccount: 'V001',
      periodYear: confirmedWeek.year,
      isoWeek: confirmedWeek.week,
      measureKey: '__requested_delivery__',
    }, baseConfig, window);
    expect(onConfirmed).toEqual([]);
  });

  it('appends the extra row onto existing matrix cells', () => {
    const cells = [];
    const measureRows = [];
    appendConfirmedDeliveryRow({
      cells,
      measureRows,
      factoryConfirmedByCell: new Map([[`V001|${confirmedWeek.year}|${confirmedWeek.week}`, 10]]),
      periods: [{ year: confirmedWeek.year, week: confirmedWeek.week, key: confirmedWeek.key }],
      vendorFilter: 'V001',
    });
    expect(measureRows).toEqual([
      expect.objectContaining({
        measureKey: '__confirmed_delivery__',
        label: 'Confirmed delivery',
        showInChart: false,
        isConfirmedDelivery: true,
      }),
    ]);
    expect(cells[0].confirmedQty).toBe(10);
  });

  it('skips sentinel and empty confirmed dates in the factory map', () => {
    const sentinel = buildFactoryConfirmedByCell(
      [row({ line: { confirmedDlvDate: '1900-01-01T00:00:00.000Z' } })],
      baseConfig,
      window,
      {},
    );
    const empty = buildFactoryConfirmedByCell(
      [row({ line: { confirmedDlvDate: '' } })],
      baseConfig,
      window,
      {},
    );
    expect(sentinel.size).toBe(0);
    expect(empty.size).toBe(0);
  });

  it('places open qty on the confirmed week in the factory map', () => {
    const map = buildFactoryConfirmedByCell([row()], baseConfig, window, {});
    expect(map.get(`V001|${confirmedWeek.year}|${confirmedWeek.week}`)).toBe(10);
    expect(map.get(`V001|${plannedWeek.year}|${plannedWeek.week}`)).toBeUndefined();
  });

  it('clips factory confirmed load outside the window', () => {
    const map = buildFactoryConfirmedByCell(
      [row({ line: { confirmedDlvDate: '2020-01-06T00:00:00.000Z' } })],
      baseConfig,
      window,
      {},
    );
    expect(map.size).toBe(0);
  });

  it('spreads header-only open qty onto confirmed-date slots', () => {
    const header = {
      recordKey: 'PO-H',
      partitionKey: 'whsl',
      values: {
        vendorAccount: 'V001',
        status: 'Open',
        dataAreaId: 'whsl',
        openQty: 30,
        confirmedDlvDate: confirmed,
      },
      details: [
        { detailKey: '1', values: { requestedDeliveryDate: planned, itemNumber: 'SKU-1' } },
        { detailKey: '2', values: { requestedDeliveryDate: planned, itemNumber: 'SKU-2' } },
      ],
    };
    const map = buildFactoryConfirmedByCell([header], baseConfig, window, {});
    expect(map.get(`V001|${confirmedWeek.year}|${confirmedWeek.week}`)).toBe(30);
  });

  it('matches drill-down on the confirmed week, not the requested week', () => {
    const onConfirmed = matchConfirmedDeliveryDrill(row(), {
      vendorAccount: 'V001',
      periodYear: confirmedWeek.year,
      isoWeek: confirmedWeek.week,
      measureKey: '__confirmed_delivery__',
    }, baseConfig, window);
    expect(onConfirmed).toEqual([
      expect.objectContaining({
        orderNumber: 'PO-A',
        itemNumber: 'SKU-1',
        quantity: 10,
        deliveryDate: confirmed,
      }),
    ]);
    const onRequested = matchConfirmedDeliveryDrill(row(), {
      vendorAccount: 'V001',
      periodYear: plannedWeek.year,
      isoWeek: plannedWeek.week,
      measureKey: '__confirmed_delivery__',
    }, baseConfig, window);
    expect(onRequested).toEqual([]);
  });

  it('shares header-only drill qty over analysis-window slots, then the cell week', () => {
    const header = {
      recordKey: 'PO-H',
      partitionKey: 'whsl',
      values: { vendorAccount: 'V001', status: 'Open', dataAreaId: 'whsl', openQty: 30 },
      details: [
        {
          detailKey: '1',
          values: { requestedDeliveryDate: planned, confirmedDlvDate: planned, itemNumber: 'SKU-1' },
        },
        {
          detailKey: '2',
          values: { requestedDeliveryDate: planned, confirmedDlvDate: confirmed, itemNumber: 'SKU-2' },
        },
      ],
    };
    const cell = {
      vendorAccount: 'V001',
      periodYear: confirmedWeek.year,
      isoWeek: confirmedWeek.week,
      measureKey: '__confirmed_delivery__',
    };
    const rows = matchConfirmedDeliveryDrill(header, cell, baseConfig, window);
    expect(rows).toEqual([
      expect.objectContaining({
        orderNumber: 'PO-H',
        itemNumber: 'SKU-2',
        quantity: 15,
        deliveryDate: confirmed,
      }),
    ]);
  });

  it('uses factory map for overload when planningDate is confirmed', () => {
    const confirmedByCell = new Map([
      [`V001|${plannedWeek.year}|${plannedWeek.week}|openQty`, 80],
    ]);
    const factoryConfirmedByCell = new Map([
      [`V001|${confirmedWeek.year}|${confirmedWeek.week}`, 120],
    ]);
    expect(openLoadForOvercapacity({
      planningDate: 'confirmed',
      confirmedByCell,
      factoryConfirmedByCell,
      vendor: 'V001',
      year: confirmedWeek.year,
      week: confirmedWeek.week,
      openMeasureKey: 'openQty',
    })).toBe(120);
    expect(openLoadForOvercapacity({
      planningDate: 'requested',
      confirmedByCell,
      factoryConfirmedByCell,
      vendor: 'V001',
      year: plannedWeek.year,
      week: plannedWeek.week,
      openMeasureKey: 'openQty',
    })).toBe(80);
  });

  it('does not double-count extra row qty into confirmed overload', () => {
    const factoryQty = 10;
    const requestedQty = 10;
    const extraRowQty = factoryQty;
    const load = openLoadForOvercapacity({
      planningDate: 'confirmed',
      confirmedByCell: new Map([
        [`V001|${plannedWeek.year}|${plannedWeek.week}|openQty`, requestedQty],
      ]),
      factoryConfirmedByCell: new Map([
        [`V001|${confirmedWeek.year}|${confirmedWeek.week}`, factoryQty],
      ]),
      vendor: 'V001',
      year: confirmedWeek.year,
      week: confirmedWeek.week,
      openMeasureKey: 'openQty',
    });
    expect(load).toBe(factoryQty);
    expect(load).not.toBe(factoryQty + extraRowQty);
    expect(load).not.toBe(factoryQty + requestedQty);
  });

  it('excludes the synthetic confirmed-delivery row from capacity load', () => {
    const chart = [
      { key: '2026-W11', openQty: 80, __confirmed_delivery__: 80, __capacity__: 100 },
      { key: '2026-W12', openQty: 120, __confirmed_delivery__: 50, __capacity__: 100 },
    ];
    const measureRows = [
      { measureKey: 'openQty', isDelivered: false },
      { measureKey: '__confirmed_delivery__', isConfirmedDelivery: true },
      { measureKey: '__capacity__', isCapacity: true },
    ];
    const kpis = buildRccpCapacityKpis(chart, measureRows, '__capacity__');
    expect(kpis.capacityShortfall).toBe(20);
    expect(kpis.overloadedWeeks).toBe(1);
  });
});
