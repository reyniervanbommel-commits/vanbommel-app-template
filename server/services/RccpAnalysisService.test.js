'use strict';

const {
  aggregatePoLoad,
  buildMatrixCells,
  cellKey,
  extractVendorsFromRows,
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
});
