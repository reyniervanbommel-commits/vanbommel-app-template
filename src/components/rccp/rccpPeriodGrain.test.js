import { describe, expect, it } from 'vitest';
import { isoWeekStartUtc } from './rccpUtils';
import {
  RCCP_PERIOD_GRAIN_MONTH,
  RCCP_PERIOD_GRAIN_WEEK,
  monthBucketFromIsoWeek,
  resolveRccpChartView,
} from './rccpPeriodGrain';

describe('monthBucketFromIsoWeek', () => {
  it('assigns an ISO week to the calendar month of its Monday', () => {
    const monday = isoWeekStartUtc(2026, 12);
    expect(monday.getUTCFullYear()).toBe(2026);
    expect(monday.getUTCMonth()).toBe(2);
    expect(monthBucketFromIsoWeek(2026, 12)).toEqual({
      year: 2026,
      month: 3,
      key: '2026-M03',
    });
  });

  it('puts ISO week 1 of 2026 in December 2025', () => {
    expect(monthBucketFromIsoWeek(2026, 1)).toEqual({
      year: 2025,
      month: 12,
      key: '2025-M12',
    });
  });
});

describe('resolveRccpChartView', () => {
  const periods = [
    { year: 2026, week: 10, key: '2026-W10' },
    { year: 2026, week: 11, key: '2026-W11' },
    { year: 2026, week: 12, key: '2026-W12' },
  ];
  const chart = [
    {
      key: '2026-W10', year: 2026, week: 10, open: 10, __capacity__: 40, __overloaded__: false,
      segmentsAbove: [{ itemNumber: 'A', qty: 10, status: 'open', late: false, dataAreaId: '' }],
      segmentsBelow: [],
    },
    {
      key: '2026-W11', year: 2026, week: 11, open: 30, __capacity__: 40, __overloaded__: false,
      segmentsAbove: [{ itemNumber: 'A', qty: 20, status: 'open', late: true, dataAreaId: '' }],
      segmentsBelow: [{ itemNumber: 'B', qty: 5, status: 'received', late: false, dataAreaId: '' }],
    },
    {
      key: '2026-W12', year: 2026, week: 12, open: 50, __capacity__: 40, __overloaded__: true,
      segmentsAbove: [],
      segmentsBelow: [],
    },
  ];
  const cells = [
    {
      measureKey: 'open', periodYear: 2026, isoWeek: 10, vendorAccount: 'V1',
      confirmedQty: 10, availableQty: 40, statusColor: 'green', statusLabel: 'OK',
    },
    {
      measureKey: 'open', periodYear: 2026, isoWeek: 11, vendorAccount: 'V1',
      confirmedQty: 30, availableQty: 40, statusColor: 'orange', statusLabel: 'Warning',
    },
    {
      measureKey: 'open', periodYear: 2026, isoWeek: 12, vendorAccount: 'V1',
      confirmedQty: 50, availableQty: 40, statusColor: 'red', statusLabel: 'Shortage',
    },
  ];

  it('returns the original week view unchanged', () => {
    const view = resolveRccpChartView({
      grain: RCCP_PERIOD_GRAIN_WEEK, periods, chart, cells,
    });
    expect(view.periods).toBe(periods);
    expect(view.chart).toBe(chart);
    expect(view.cellMap.get('open|2026|10').confirmedQty).toBe(10);
  });

  it('rolls ISO weeks into calendar months and sums quantities', () => {
    const view = resolveRccpChartView({
      grain: RCCP_PERIOD_GRAIN_MONTH, periods, chart, cells,
    });
    expect(view.periods).toEqual([
      expect.objectContaining({
        year: 2026, month: 3, key: '2026-M03', week: 10, lastWeek: 12, lastYear: 2026,
      }),
    ]);
    expect(view.chart).toHaveLength(1);
    expect(view.chart[0].open).toBe(90);
    expect(view.chart[0].__capacity__).toBe(120);
    expect(view.chart[0].__overloaded__).toBe(false);
    expect(view.chart[0].segmentsAbove).toEqual([
      expect.objectContaining({ itemNumber: 'A', qty: 30, status: 'open', late: true }),
    ]);
    expect(view.chart[0].segmentsBelow).toEqual([
      expect.objectContaining({ itemNumber: 'B', qty: 5, status: 'received' }),
    ]);
    expect(view.cellMap.get('open|2026|3').confirmedQty).toBe(90);
    expect(view.cellMap.get('open|2026|3').availableQty).toBe(120);
    expect(view.cellMap.get('open|2026|3').statusColor).toBe('red');
  });

  it('marks a month overloaded when summed load exceeds summed capacity', () => {
    const view = resolveRccpChartView({
      grain: RCCP_PERIOD_GRAIN_MONTH,
      periods: [{ year: 2026, week: 12, key: '2026-W12' }],
      chart: [{
        key: '2026-W12', year: 2026, week: 12, open: 50, __capacity__: 40, __overloaded__: true,
        segmentsAbove: [], segmentsBelow: [],
      }],
      cells: [],
    });
    expect(view.chart[0].__overloaded__).toBe(true);
  });
});
