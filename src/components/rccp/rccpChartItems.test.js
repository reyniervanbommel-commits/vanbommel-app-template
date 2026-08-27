import { describe, expect, it } from 'vitest';
import {
  collectRccpChartItemNumbers,
  filterRccpChartByItem,
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
  });

  it('keeps only the selected unique item', () => {
    expect(matchRccpChartItem({ itemNumber: 'A' }, 'A')).toBe(true);
    expect(matchRccpChartItem({ itemNumber: 'B' }, 'A')).toBe(false);
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
});
