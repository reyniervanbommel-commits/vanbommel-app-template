import { describe, expect, it } from 'vitest';
import { overlayConfirmedHistory } from './rccpConfirmedOverlay';

const baseChart = [
  {
    key: '2026-W12',
    year: 2026,
    week: 12,
    segmentsAbove: [{ itemNumber: 'SKU-1', qty: 10, status: 'open', dataAreaId: 'whsl' }],
    segmentsBelow: [],
    segmentsConfirmed: [
      { itemNumber: 'SKU-1', qty: 4, status: 'received', dataAreaId: 'whsl' },
      { itemNumber: 'SKU-1', qty: 10, status: 'open', dataAreaId: 'whsl' },
    ],
  },
  {
    key: '2026-W13',
    year: 2026,
    week: 13,
    segmentsAbove: [],
    segmentsBelow: [],
    segmentsConfirmed: [],
  },
];

describe('confirmedHistoryOverlay', () => {
  it('moves all open qty of the item to the chosen version week', () => {
    const chart = overlayConfirmedHistory(baseChart, {
      itemNumber: 'SKU-1',
      selectedDate: '2026-03-23T00:00:00.000Z',
      versions: [{ at: 't', date: '2026-03-23T00:00:00.000Z' }],
      showAll: false,
    });
    expect(chart.find((point) => point.key === '2026-W12').segmentsConfirmed).toEqual([
      { itemNumber: 'SKU-1', qty: 4, status: 'received', dataAreaId: 'whsl' },
    ]);
    expect(chart.find((point) => point.key === '2026-W13').segmentsConfirmed).toEqual([
      { itemNumber: 'SKU-1', qty: 10, status: 'open', late: false, dataAreaId: 'whsl' },
    ]);
  });

  it('places open qty on each unique history date and keeps received', () => {
    const chart = overlayConfirmedHistory(baseChart, {
      itemNumber: 'SKU-1',
      selectedDate: '2026-03-23T00:00:00.000Z',
      versions: [
        { at: 't1', date: '2026-03-16T00:00:00.000Z' },
        { at: 't2', date: '2026-03-23T00:00:00.000Z' },
      ],
      showAll: true,
      lines: [
        { qty: 4, dates: ['2026-03-23T00:00:00.000Z'] },
        { qty: 6, dates: ['2026-03-16T00:00:00.000Z', '2026-03-23T00:00:00.000Z'] },
      ],
    });
    expect(chart.find((point) => point.key === '2026-W12').segmentsConfirmed).toEqual([
      { itemNumber: 'SKU-1', qty: 4, status: 'received', dataAreaId: 'whsl' },
      { itemNumber: 'SKU-1', qty: 6, status: 'open', late: false, dataAreaId: 'whsl' },
    ]);
    expect(chart.find((point) => point.key === '2026-W13').segmentsConfirmed).toEqual([
      { itemNumber: 'SKU-1', qty: 10, status: 'open', late: false, dataAreaId: 'whsl' },
    ]);
  });

  it('leaves the chart unchanged without an item', () => {
    expect(overlayConfirmedHistory(baseChart, { itemNumber: '', showAll: false })).toBe(baseChart);
  });
});
