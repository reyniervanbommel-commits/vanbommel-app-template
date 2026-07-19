'use strict';

const {
  aggregatePoLoad,
  buildDrillDownRows,
  buildMatrixCells,
  cellKey,
  extractVendorsFromRows,
  extractVendorNamesFromRows,
} = require('../services/RccpAnalysisService');
const { getIsoWeek, getIsoWeekYear } = require('../utils/isoWeek');

describe('RccpAnalysisService', () => {
  const config = {
    dateColumnKey: 'requestedDeliveryDate',
    vendorColumnKey: 'vendorAccount',
    quantityMeasures: [{
      columnKey: 'quantity',
      label: 'Quantity',
      chartType: 'line',
      color: '#D13438',
      showInChart: true,
    }],
    excludedStatuses: ['Canceled'],
    thresholds: { greenMax: 80, orangeMax: 100 },
  };

  const window = { fromYear: 2026, fromWeek: 10, toYear: 2026, toWeek: 12 };

  it('aggregates confirmed load per quantity measure', () => {
    const deliveryDate = '2026-03-10T00:00:00.000Z';
    const year = getIsoWeekYear(deliveryDate);
    const week = getIsoWeek(deliveryDate);
    const testWindow = { fromYear: year, fromWeek: week, toYear: year, toWeek: week };
    const rows = [{
      recordKey: 'PO-1',
      values: { vendorAccount: 'V001', status: 'Open', quantity: 15 },
      details: [{
        detailKey: '1',
        values: { requestedDeliveryDate: deliveryDate },
      }],
    }];

    const { confirmedByCell, missingDates } = aggregatePoLoad(rows, config, testWindow);
    expect(missingDates).toHaveLength(0);
    expect(confirmedByCell.get(cellKey('V001', year, week, 'quantity'))).toBe(15);
  });

  it('counts a line-level quantity per line instead of spreading it', () => {
    const deliveryDate = '2026-03-10T00:00:00.000Z';
    const year = getIsoWeekYear(deliveryDate);
    const week = getIsoWeek(deliveryDate);
    const testWindow = { fromYear: year, fromWeek: week, toYear: year, toWeek: week };
    const rows = [{
      recordKey: 'PO-1',
      // Geen quantity op de order: die staat op de regels (het echte D365-geval).
      values: { vendorAccount: 'V001', status: 'Open' },
      details: [
        { detailKey: '1', values: { requestedDeliveryDate: deliveryDate, quantity: 7 } },
        { detailKey: '2', values: { requestedDeliveryDate: deliveryDate, quantity: 5 } },
      ],
    }];

    const { confirmedByCell, diagnostics } = aggregatePoLoad(rows, config, testWindow);
    expect(confirmedByCell.get(cellKey('V001', year, week, 'quantity'))).toBe(12);
    expect(diagnostics.zeroQuantityLines).toBe(0);
    expect(diagnostics.countedLines).toBe(2);
  });

  it('spreads an order-level total across its lines', () => {
    const deliveryDate = '2026-03-10T00:00:00.000Z';
    const year = getIsoWeekYear(deliveryDate);
    const week = getIsoWeek(deliveryDate);
    const testWindow = { fromYear: year, fromWeek: week, toYear: year, toWeek: week };
    const rows = [{
      recordKey: 'PO-1',
      values: { vendorAccount: 'V001', status: 'Open', quantity: 10 },
      details: [
        { detailKey: '1', values: { requestedDeliveryDate: deliveryDate } },
        { detailKey: '2', values: { requestedDeliveryDate: deliveryDate } },
      ],
    }];

    const { confirmedByCell } = aggregatePoLoad(rows, config, testWindow);
    expect(confirmedByCell.get(cellKey('V001', year, week, 'quantity'))).toBe(10);
  });

  it('prefers the line quantity over an order total when both exist', () => {
    const deliveryDate = '2026-03-10T00:00:00.000Z';
    const year = getIsoWeekYear(deliveryDate);
    const week = getIsoWeek(deliveryDate);
    const testWindow = { fromYear: year, fromWeek: week, toYear: year, toWeek: week };
    const rows = [{
      recordKey: 'PO-1',
      values: { vendorAccount: 'V001', status: 'Open', quantity: 999 },
      details: [
        { detailKey: '1', values: { requestedDeliveryDate: deliveryDate, quantity: 3 } },
        { detailKey: '2', values: { requestedDeliveryDate: deliveryDate, quantity: 4 } },
      ],
    }];

    const { confirmedByCell } = aggregatePoLoad(rows, config, testWindow);
    expect(confirmedByCell.get(cellKey('V001', year, week, 'quantity'))).toBe(7);
  });

  it('puts rows without dates in missingDates and excludes canceled statuses', () => {
    const rows = [{
      recordKey: 'PO-2',
      values: { vendorAccount: 'V001', status: 'Canceled', quantity: 8 },
      details: [{ detailKey: '1', values: {} }],
    }, {
      recordKey: 'PO-3',
      values: { vendorAccount: 'V001', status: 'Open', quantity: 4 },
      details: [{ detailKey: '1', values: {} }],
    }];

    const { confirmedByCell, missingDates } = aggregatePoLoad(rows, config, window);
    expect(confirmedByCell.size).toBe(0);
    expect(missingDates).toHaveLength(1);
    expect(missingDates[0].orderNumber).toBe('PO-3');
  });

  it('marks unplanned cells red when confirmed exceeds zero available capacity', () => {
    const confirmedByCell = new Map([[cellKey('V001', 2026, 10, 'quantity'), 25]]);
    const { cells } = buildMatrixCells({
      capacityRows: [],
      confirmedByCell,
      config,
      window,
      vendorFilter: 'V001',
    });
    const loadCell = cells.find((c) => c.measureKey === 'quantity');
    expect(loadCell.statusLabel).toBe('Unplanned');
    expect(loadCell.statusColor).toBe('red');
  });

  it('adds a capacity row for every week, also without capacity', () => {
    const { cells } = buildMatrixCells({
      capacityRows: [],
      confirmedByCell: new Map([[cellKey('V001', 2026, 10, 'quantity'), 5]]),
      config,
      window,
      vendorFilter: 'V001',
    });
    const capCells = cells.filter((c) => c.measureKey === '__capacity__');
    // 3 weken in het venster -> capaciteitscel per week, ook al is availableQty 0.
    expect(capCells).toHaveLength(3);
    expect(capCells.every((c) => c.availableQty === 0)).toBe(true);
  });

  describe('overcapacity', () => {
    const openConfig = { ...config, openMeasureKey: 'quantity' };

    it('adds an overcapacity row = capacity minus the open measure', () => {
      const { cells, measureRows } = buildMatrixCells({
        capacityRows: [{ vendorAccount: 'V001', periodYear: 2026, isoWeek: 10, availableQty: 30 }],
        confirmedByCell: new Map([[cellKey('V001', 2026, 10, 'quantity'), 12]]),
        config: openConfig,
        window,
        vendorFilter: 'V001',
      });
      const over = cells.find((c) => c.measureKey === '__overcapacity__' && c.isoWeek === 10);
      expect(over.confirmedQty).toBe(18); // 30 - 12
      expect(over.statusColor).toBe('green');
      expect(measureRows.some((r) => r.measureKey === '__overcapacity__')).toBe(true);
    });

    it('shows a shortage as a negative value in red', () => {
      const { cells } = buildMatrixCells({
        capacityRows: [{ vendorAccount: 'V001', periodYear: 2026, isoWeek: 10, availableQty: 8 }],
        confirmedByCell: new Map([[cellKey('V001', 2026, 10, 'quantity'), 20]]),
        config: openConfig,
        window,
        vendorFilter: 'V001',
      });
      const over = cells.find((c) => c.measureKey === '__overcapacity__' && c.isoWeek === 10);
      expect(over.confirmedQty).toBe(-12); // 8 - 20
      expect(over.statusColor).toBe('red');
      expect(over.statusLabel).toBe('Shortage');
    });

    it('omits the overcapacity row when no open measure is selected', () => {
      const { cells, measureRows } = buildMatrixCells({
        capacityRows: [],
        confirmedByCell: new Map([[cellKey('V001', 2026, 10, 'quantity'), 5]]),
        config,
        window,
        vendorFilter: 'V001',
      });
      expect(cells.some((c) => c.measureKey === '__overcapacity__')).toBe(false);
      expect(measureRows.some((r) => r.measureKey === '__overcapacity__')).toBe(false);
    });
  });

  it('scopes matrix cells to a supplier vendor', () => {
    const confirmedByCell = new Map([
      [cellKey('V001', 2026, 10, 'quantity'), 5],
      [cellKey('V002', 2026, 10, 'quantity'), 9],
    ]);
    const { cells } = buildMatrixCells({
      capacityRows: [],
      confirmedByCell,
      config,
      window,
      vendorFilter: 'V001',
    });
    expect(cells.every((c) => c.vendorAccount === 'V001')).toBe(true);
  });

  it('extracts distinct sorted vendors from main table rows', () => {
    const rows = [
      { values: { vendorAccount: 'V002' } },
      { values: { vendorAccount: 'V001' } },
      { values: { vendorAccount: 'V002' } },
      { values: { vendorAccount: '' } },
    ];
    expect(extractVendorsFromRows(rows, 'vendorAccount')).toEqual(['V001', 'V002']);
  });

  it('maps vendor values to their vendor name and skips vendors without one', () => {
    const rows = [
      { values: { vendorAccount: 'V001', vendorName: 'Vendor BV' } },
      { values: { vendorAccount: 'V001', vendorName: 'Vendor BV' } },
      { values: { vendorAccount: 'V002', vendorName: '' } },
      { values: { vendorAccount: 'V003' } },
    ];
    expect(extractVendorNamesFromRows(rows, 'vendorAccount')).toEqual({ V001: 'Vendor BV' });
  });

  it('falls back to a later row when the first row has no vendor name', () => {
    const rows = [
      { values: { vendorAccount: 'V001' } },
      { values: { vendorAccount: 'V001', vendorName: 'Vendor BV' } },
    ];
    expect(extractVendorNamesFromRows(rows, 'vendorAccount')).toEqual({ V001: 'Vendor BV' });
  });

  it('buildDrillDownRows includes line-level quantities', () => {
    const deliveryDate = '2026-03-10T00:00:00.000Z';
    const year = getIsoWeekYear(deliveryDate);
    const week = getIsoWeek(deliveryDate);
    const testWindow = { fromYear: year, fromWeek: week, toYear: year, toWeek: week };
    const rows = [{
      recordKey: 'PO-1',
      values: { vendorAccount: 'V001', status: 'Open' },
      details: [
        { detailKey: '1', values: { requestedDeliveryDate: deliveryDate, quantity: 7 } },
        { detailKey: '2', values: { requestedDeliveryDate: deliveryDate, quantity: 5 } },
      ],
    }];
    const cell = { vendorAccount: 'V001', periodYear: year, isoWeek: week, measureKey: 'quantity' };

    const result = buildDrillDownRows(rows, config, cell, testWindow);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.quantity).sort((a, b) => a - b)).toEqual([5, 7]);
  });

  it('buildDrillDownRows spreads order-level quantity across lines without line qty', () => {
    const deliveryDate = '2026-03-10T00:00:00.000Z';
    const year = getIsoWeekYear(deliveryDate);
    const week = getIsoWeek(deliveryDate);
    const testWindow = { fromYear: year, fromWeek: week, toYear: year, toWeek: week };
    const rows = [{
      recordKey: 'PO-1',
      values: { vendorAccount: 'V001', status: 'Open', quantity: 10 },
      details: [
        { detailKey: '1', values: { requestedDeliveryDate: deliveryDate } },
        { detailKey: '2', values: { requestedDeliveryDate: deliveryDate } },
      ],
    }];
    const cell = { vendorAccount: 'V001', periodYear: year, isoWeek: week, measureKey: 'quantity' };

    const result = buildDrillDownRows(rows, config, cell, testWindow);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.quantity === 5)).toBe(true);
  });

  it('buildDrillDownRows includes lookup measures such as receivedPurchaseQuantity', () => {
    const deliveryDate = '2021-11-08T12:00:00Z';
    const year = getIsoWeekYear(deliveryDate);
    const week = getIsoWeek(deliveryDate);
    const testWindow = { fromYear: year, fromWeek: week, toYear: year, toWeek: week };
    const rows = [{
      recordKey: 'WSPO-1',
      values: { vendorAccount: 'V000583', status: 'Invoiced' },
      details: [{
        detailKey: '1',
        values: { requestedDeliveryDate: deliveryDate, receivedPurchaseQuantity: 150 },
      }],
    }];
    const cell = {
      vendorAccount: 'V000583',
      periodYear: year,
      isoWeek: week,
      measureKey: 'receivedPurchaseQuantity',
    };

    const result = buildDrillDownRows(rows, config, cell, testWindow);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(150);
    expect(result[0].orderNumber).toBe('WSPO-1');
  });
});
