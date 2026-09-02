import { describe, expect, it } from 'vitest';
import {
  collectRccpChartItemNumbers,
  filterRccpChartBySegments,
  filterRccpChartByItem,
  filterRccpMatrixByItem,
  matchRccpChartItem,
} from './rccpChartItems';

describe('collectRccpChartItemNumbers', () => {
  it('returns unique sorted item numbers from both stack sides', () => {
    expect(collectRccpChartItemNumbers([
      {
        segmentsAbove: [
          { itemNumber: 'CFM-2', qty: 1, status: 'open' },
          { itemNumber: 'CBM-1', qty: 2, status: 'received' },
        ],
        segmentsBelow: [{ itemNumber: 'CFM-2', qty: 1, status: 'received' }],
      },
      { segmentsAbove: [{ itemNumber: '  ', qty: 1 }], segmentsBelow: [] },
    ])).toEqual(['CBM-1', 'CFM-2']);
  });

  it('returns an empty list when the chart has no items', () => {
    expect(collectRccpChartItemNumbers([])).toEqual([]);
    expect(collectRccpChartItemNumbers(null)).toEqual([]);
  });
});

describe('matchRccpChartItem', () => {
  it('keeps every segment when no item is selected', () => {
    expect(matchRccpChartItem({ itemNumber: 'A' }, '')).toBe(true);
    expect(matchRccpChartItem({ itemNumber: 'A' }, [])).toBe(true);
  });

  it('keeps only the selected unique item', () => {
    expect(matchRccpChartItem({ itemNumber: 'A' }, 'A')).toBe(true);
    expect(matchRccpChartItem({ itemNumber: 'B' }, 'A')).toBe(false);
  });

  it('keeps segments that match any selected item', () => {
    expect(matchRccpChartItem({ itemNumber: 'A' }, ['A', 'C'])).toBe(true);
    expect(matchRccpChartItem({ itemNumber: 'B' }, ['A', 'C'])).toBe(false);
  });
});

describe('filterRccpChartByItem', () => {
  const chart = [{
    week: '2022-W25',
    load: 10,
    segmentsAbove: [
      { itemNumber: 'A', qty: 2, status: 'open' },
      { itemNumber: 'B', qty: 3, status: 'received' },
    ],
    segmentsBelow: [{ itemNumber: 'A', qty: 1, status: 'received' }],
  }];

  it('returns the original points when no item is selected', () => {
    expect(filterRccpChartByItem(chart, '')).toBe(chart);
  });

  it('keeps only the selected item stacks and leaves load intact', () => {
    expect(filterRccpChartByItem(chart, 'A')).toEqual([{
      week: '2022-W25',
      load: 10,
      segmentsAbove: [{ itemNumber: 'A', qty: 2, status: 'open' }],
      segmentsBelow: [{ itemNumber: 'A', qty: 1, status: 'received' }],
    }]);
  });

  it('keeps stacks for every selected item', () => {
    expect(filterRccpChartByItem(chart, ['A', 'B'])).toEqual(chart);
    expect(filterRccpChartByItem(chart, ['B'])[0].segmentsAbove).toEqual([
      { itemNumber: 'B', qty: 3, status: 'received' },
    ]);
  });

  it('hides every stack when an active filter matches no items', () => {
    expect(filterRccpChartByItem(chart, [], { emptyHidesAll: true })[0]).toEqual({
      week: '2022-W25',
      load: 10,
      segmentsAbove: [],
      segmentsBelow: [],
    });
  });

  it('rewrites ordered and received measure keys from the filtered stacks', () => {
    const rows = [
      { measureKey: 'quantity', isOrdered: true },
      { measureKey: 'receivedPurchQty', isDelivered: true },
    ];
    expect(filterRccpChartByItem(chart, 'A', { measureRows: rows })[0]).toEqual({
      week: '2022-W25',
      load: 10,
      quantity: 2,
      receivedPurchQty: -1,
      segmentsAbove: [{ itemNumber: 'A', qty: 2, status: 'open' }],
      segmentsBelow: [{ itemNumber: 'A', qty: 1, status: 'received' }],
    });
  });

  it('filters stacks by contains term in one pass', () => {
    expect(filterRccpChartByItem(chart, [], { containsTerm: 'a' })[0]).toEqual({
      week: '2022-W25',
      load: 10,
      segmentsAbove: [{ itemNumber: 'A', qty: 2, status: 'open' }],
      segmentsBelow: [{ itemNumber: 'A', qty: 1, status: 'received' }],
    });
  });
});

describe('filterRccpChartBySegments', () => {
  const chart = [{
    week: '2026-W12',
    segmentsAbove: [
      { itemNumber: 'A', poNumber: 'PO-1', qty: 2, status: 'open' },
      { itemNumber: 'A', poNumber: 'PO-2', qty: 3, status: 'open' },
    ],
    segmentsBelow: [],
  }];

  it('keeps only stacks whose poNumber is in the visible set', () => {
    expect(filterRccpChartBySegments(chart, { orderNumbers: ['PO-1'] })[0].segmentsAbove)
      .toEqual([{ itemNumber: 'A', poNumber: 'PO-1', qty: 2, status: 'open' }]);
  });

  it('ANDs item and PO', () => {
    const mixed = [{
      week: '2026-W12',
      segmentsAbove: [
        { itemNumber: 'A', poNumber: 'PO-1', qty: 2, status: 'open' },
        { itemNumber: 'B', poNumber: 'PO-1', qty: 4, status: 'open' },
      ],
      segmentsBelow: [],
    }];
    expect(filterRccpChartBySegments(mixed, { items: ['A'], orderNumbers: ['PO-1'] })[0].segmentsAbove)
      .toEqual([{ itemNumber: 'A', poNumber: 'PO-1', qty: 2, status: 'open' }]);
  });

  it('hides all stacks when orderNumbers is an empty list and emptyHidesAll', () => {
    expect(filterRccpChartBySegments(chart, { orderNumbers: [], emptyHidesAll: true })[0].segmentsAbove)
      .toEqual([]);
  });

  it('keeps matching PO stacks with emptyHidesAll when no item filter is set', () => {
    expect(filterRccpChartBySegments(chart, { orderNumbers: ['PO-1'], emptyHidesAll: true })[0].segmentsAbove)
      .toEqual([{ itemNumber: 'A', poNumber: 'PO-1', qty: 2, status: 'open' }]);
  });
});

describe('filterRccpMatrixByItem', () => {
  const measureRows = [
    { measureKey: 'open', isOpen: true },
    { measureKey: 'ordered', isOrdered: true },
    { measureKey: 'received', isDelivered: true },
    { measureKey: '__capacity__', isCapacity: true },
    { measureKey: '__overcapacity__', isOvercapacity: true },
  ];
  const cellMap = new Map([
    ['open|2022|25', { measureKey: 'open', periodYear: 2022, isoWeek: 25, confirmedQty: 10 }],
    ['ordered|2022|25', { measureKey: 'ordered', periodYear: 2022, isoWeek: 25, confirmedQty: 4 }],
    ['received|2022|25', { measureKey: 'received', periodYear: 2022, isoWeek: 25, confirmedQty: 5 }],
    ['__capacity__|2022|25', {
      measureKey: '__capacity__', periodYear: 2022, isoWeek: 25, availableQty: 40, confirmedQty: 0,
    }],
    ['__overcapacity__|2022|25', {
      measureKey: '__overcapacity__', periodYear: 2022, isoWeek: 25, availableQty: 40, confirmedQty: 30,
    }],
  ]);
  const filteredChart = [{
    year: 2022,
    week: 25,
    segmentsAbove: [
      { itemNumber: 'A', qty: 2, status: 'open' },
      { itemNumber: 'A', qty: 1, status: 'ordered' },
    ],
    segmentsBelow: [{ itemNumber: 'A', qty: 1, status: 'received' }],
  }];

  it('returns the same map when the item filter is inactive', () => {
    expect(filterRccpMatrixByItem(cellMap, { chart: filteredChart, measureRows, active: false }))
      .toBe(cellMap);
  });

  it('rewrites PO rows and overcapacity from the filtered stacks', () => {
    const next = filterRccpMatrixByItem(cellMap, { chart: filteredChart, measureRows, active: true });
    expect(next.get('open|2022|25').confirmedQty).toBe(2);
    expect(next.get('ordered|2022|25').confirmedQty).toBe(3);
    expect(next.get('received|2022|25').confirmedQty).toBe(1);
    expect(next.get('__capacity__|2022|25').availableQty).toBe(40);
    expect(next.get('__overcapacity__|2022|25').confirmedQty).toBe(38);
  });
});
