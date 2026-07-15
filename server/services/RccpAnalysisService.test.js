'use strict';

const {
  aggregatePoLoad,
  buildMatrixCells,
  cellKey,
} = require('../services/RccpAnalysisService');

describe('RccpAnalysisService', () => {
  const config = {
    dateColumnKey: 'requestedDeliveryDate',
    quantityColumnKey: 'orderedPurchaseQuantity',
    categoryColumnKey: 'productCategory',
    vendorColumnKey: 'vendorAccount',
    excludedStatuses: ['Canceled'],
    thresholds: { greenMax: 80, orangeMax: 100 },
  };

  const window = { fromYear: 2026, fromWeek: 10, toYear: 2026, toWeek: 12 };

  it('aggregates confirmed load without double counting lines', () => {
    const rows = [{
      recordKey: 'PO-1',
      values: { vendorAccount: 'V001', status: 'Open' },
      details: [
        {
          detailKey: '1',
          values: {
            orderedPurchaseQuantity: 10,
            productCategory: 'Knitwear',
            requestedDeliveryDate: '2026-03-10T00:00:00.000Z',
          },
        },
        {
          detailKey: '2',
          values: {
            orderedPurchaseQuantity: 5,
            productCategory: 'Knitwear',
            requestedDeliveryDate: '2026-03-10T00:00:00.000Z',
          },
        },
      ],
    }];

    const { confirmedByCell, missingDates } = aggregatePoLoad(rows, config, window);
    expect(missingDates).toHaveLength(0);
    const keys = [...confirmedByCell.keys()];
    expect(keys).toHaveLength(1);
    expect(confirmedByCell.get(keys[0])).toBe(15);
  });

  it('puts rows without dates in missingDates and excludes canceled statuses', () => {
    const rows = [{
      recordKey: 'PO-2',
      values: { vendorAccount: 'V001', status: 'Canceled' },
      details: [{
        detailKey: '1',
        values: { orderedPurchaseQuantity: 8, productCategory: 'Knitwear' },
      }],
    }, {
      recordKey: 'PO-3',
      values: { vendorAccount: 'V001', status: 'Open' },
      details: [{
        detailKey: '1',
        values: { orderedPurchaseQuantity: 4, productCategory: 'Knitwear' },
      }],
    }];

    const { confirmedByCell, missingDates } = aggregatePoLoad(rows, config, window);
    expect(confirmedByCell.size).toBe(0);
    expect(missingDates).toHaveLength(1);
    expect(missingDates[0].orderNumber).toBe('PO-3');
  });

  it('marks unplanned cells red when confirmed exceeds zero available capacity', () => {
    const key = cellKey('V001', 2026, 10, 'Knitwear');
    const confirmedByCell = new Map([[key, 25]]);
    const { cells } = buildMatrixCells({
      capacityRows: [],
      confirmedByCell,
      config,
      window,
      vendorFilter: 'V001',
    });
    expect(cells[0].statusLabel).toBe('Unplanned');
    expect(cells[0].statusColor).toBe('red');
  });

  it('scopes matrix cells to a supplier vendor', () => {
    const keyA = cellKey('V001', 2026, 10, 'Knitwear');
    const keyB = cellKey('V002', 2026, 10, 'Knitwear');
    const confirmedByCell = new Map([[keyA, 5], [keyB, 9]]);
    const { cells } = buildMatrixCells({
      capacityRows: [],
      confirmedByCell,
      config,
      window,
      vendorFilter: 'V001',
    });
    expect(cells).toHaveLength(1);
    expect(cells[0].vendorAccount).toBe('V001');
  });
});
