import { describe, expect, it } from 'vitest';
import {
  todayLineX,
  todayBand,
  stackRectLayout,
  isoWeekPartsUtc,
  RCCP_PO_BAR_SIZE,
  weekBarBox,
  isReceivedPairHighlight,
  poSegmentStroke,
  isCurrentMatrixPeriod,
  rccpChartYDomain,
  rccpNiceYExtent,
  rccpSymmetricYAxisDomain,
  rccpPoStackBarFlags,
  visibleAboveSegments,
} from './rccpPoStack';
import { RCCP_CHART_Y_AXIS_WIDTH, RCCP_WEEK_COL_WIDTH } from './rccpUtils';

describe('rccpPoStack', () => {
  it('uses 80% of the week column as bar width', () => {
    expect(RCCP_PO_BAR_SIZE).toBe(Math.round(RCCP_WEEK_COL_WIDTH * 0.8));
  });

  it('centers a bar inside the week band', () => {
    expect(weekBarBox(0, RCCP_PO_BAR_SIZE).width).toBe(RCCP_PO_BAR_SIZE);
    expect(weekBarBox(0, RCCP_PO_BAR_SIZE).x).toBe(
      RCCP_CHART_Y_AXIS_WIDTH + (RCCP_WEEK_COL_WIDTH - RCCP_PO_BAR_SIZE) / 2,
    );
    expect(weekBarBox(1, RCCP_PO_BAR_SIZE).x).toBe(
      RCCP_CHART_Y_AXIS_WIDTH + RCCP_WEEK_COL_WIDTH + (RCCP_WEEK_COL_WIDTH - RCCP_PO_BAR_SIZE) / 2,
    );
  });

  it('returns null for todayLineX when the current week is outside the window', () => {
    const periods = [{ key: '2020-W01', year: 2020, week: 1 }];
    expect(todayLineX(periods, new Date('2026-03-16T00:00:00.000Z'))).toBeNull();
  });

  it('uses the ISO week-1 Monday (Jan 4 method) when 1 Jan is a Friday', () => {
    const parts = isoWeekPartsUtc(new Date('2021-11-08T12:00:00.000Z'));
    expect(parts).toMatchObject({ year: 2021, week: 45, key: '2021-W45', weekday: 1 });
    expect(isoWeekPartsUtc(new Date('2021-11-19T12:00:00.000Z')).week).toBe(46);
    expect(isoWeekPartsUtc(new Date('2021-12-10T12:00:00.000Z')).week).toBe(49);
  });

  it('places the today line on the real weekday inside the current ISO week column', () => {
    const now = new Date('2026-03-18T12:00:00.000Z'); // Wednesday
    const parts = isoWeekPartsUtc(now);
    expect(parts.weekday).toBe(3);
    const periods = [{ key: parts.key, year: parts.year, week: parts.week }];
    const x = todayLineX(periods, now);
    expect(x).toBe(
      RCCP_CHART_Y_AXIS_WIDTH + (0 + (3 - 0.5) / 7) * RCCP_WEEK_COL_WIDTH,
    );
  });

  it('returns a full-column band for the current period', () => {
    const now = new Date('2026-03-18T12:00:00.000Z');
    const parts = isoWeekPartsUtc(now);
    const periods = [{ key: parts.key, year: parts.year, week: parts.week }];
    const band = todayBand(periods, now);
    expect(band.index).toBe(0);
    expect(band.bandX).toBe(RCCP_CHART_Y_AXIS_WIDTH);
    expect(band.bandWidth).toBe(RCCP_WEEK_COL_WIDTH);
    expect(band.todayX).toBe(todayLineX(periods, now));
  });

  it('places the today line by day-of-month inside a month column', () => {
    const now = new Date('2026-03-16T12:00:00.000Z');
    const periods = [{ key: '2026-M03', year: 2026, month: 3, week: 10, lastWeek: 13 }];
    const x = todayLineX(periods, now);
    expect(x).toBe(
      RCCP_CHART_Y_AXIS_WIDTH + (0 + (16 - 0.5) / 31) * RCCP_WEEK_COL_WIDTH,
    );
  });

  it('stacks received against the axis then open outward', () => {
    const segments = [
      { poNumber: 'PO-A', qty: 4, status: 'received' },
      { poNumber: 'PO-A', qty: 6, status: 'open' },
    ];
    const above = stackRectLayout(segments, 10, 100, 'above');
    expect(above[0].segment.status).toBe('received');
    expect(above[0].y + above[0].height).toBe(110);
    expect(above[1].segment.status).toBe('open');
    expect(above[1].y).toBe(10);
    const below = stackRectLayout(segments, 110, 50, 'below');
    expect(below[0].y).toBe(110);
    expect(below[1].y).toBe(110 + 20);
  });

  it('anchors below-axis bars to the zero line when Recharts sends negative height', () => {
    const segments = [{ poNumber: 'PO-A', qty: 10, status: 'received' }];
    const below = stackRectLayout(segments, 160, -50, 'below');
    expect(below[0].y).toBe(110);
    expect(below[0].height).toBe(50);
  });

  it('highlights matching received segments of the same item', () => {
    expect(isReceivedPairHighlight({ status: 'received', itemNumber: 'SKU-1' }, 'SKU-1')).toBe(true);
    expect(isReceivedPairHighlight({ status: 'received', itemNumber: 'SKU-2' }, 'SKU-1')).toBe(false);
    expect(isReceivedPairHighlight({ status: 'open', itemNumber: 'SKU-1' }, 'SKU-1')).toBe(false);
    expect(isReceivedPairHighlight({ status: 'ordered', itemNumber: 'SKU-1' }, 'SKU-1')).toBe(true);
    expect(isReceivedPairHighlight({ status: 'received', itemNumber: 'SKU-1' }, '')).toBe(false);
  });

  it('does not draw a late outline on received boxes', () => {
    expect(poSegmentStroke({ status: 'received', late: true }, false)).toEqual({
      stroke: 'none', strokeWidth: 0,
    });
    expect(poSegmentStroke({ status: 'received', late: true }, true).strokeWidth).toBeGreaterThan(0);
  });

  it('keeps 0 in the Y domain and matches the scale above and below the axis', () => {
    expect(rccpChartYDomain([
      { __stackAbove: 1601, __stackBelow: 0, remaining: 21 },
      { __stackAbove: 0, __stackBelow: -3000, remaining: 0 },
    ], ['remaining'])).toEqual([-5000, 5000]);
  });

  it('snaps the Y extent to round steps like 100, 250, 500, 1000', () => {
    expect(rccpNiceYExtent(100)).toBe(100);
    expect(rccpNiceYExtent(21)).toBe(50);
    expect(rccpNiceYExtent(240)).toBe(500);
    expect(rccpNiceYExtent(501)).toBe(1000);
    expect(rccpNiceYExtent(1601)).toBe(2000);
    expect(rccpNiceYExtent(3000)).toBe(5000);
  });

  it('forces Recharts to keep equal scale when visible series are one-sided', () => {
    const props = rccpSymmetricYAxisDomain([-3000, 3000]);
    expect(props.type).toBe('number');
    expect(props.allowDataOverflow).toBe(true);
    expect(props.domain).toEqual([-5000, 5000]);
    expect(props.ticks).toEqual([-5000, -2500, 0, 2500, 5000]);
    expect(Math.abs(props.domain[0])).toBe(Math.abs(props.domain[1]));
  });

  it('groups remaining segments together at the top of the week bar', () => {
    expect(visibleAboveSegments([
      { itemNumber: 'SKU-A', qty: 4, status: 'ordered' },
      { itemNumber: 'SKU-A', qty: 6, status: 'open' },
      { itemNumber: 'SKU-B', qty: 3, status: 'ordered' },
      { itemNumber: 'SKU-B', qty: 2, status: 'open' },
    ], { openVisible: true, orderedVisible: true }).map((seg) => `${seg.itemNumber}:${seg.status}`)).toEqual([
      'SKU-A:ordered',
      'SKU-B:ordered',
      'SKU-A:open',
      'SKU-B:open',
    ]);
  });

  it('keeps remaining boxes when quantity is off and remaining stays on', () => {
    const remaining = visibleAboveSegments([
      { itemNumber: 'SKU-A', qty: 4, status: 'ordered' },
      { itemNumber: 'SKU-A', qty: 6, status: 'open' },
      { itemNumber: 'SKU-B', qty: 2, status: 'open' },
    ], { openVisible: true, orderedVisible: false });
    expect(remaining.map((seg) => `${seg.itemNumber}:${seg.status}`)).toEqual([
      'SKU-A:open',
      'SKU-B:open',
    ]);
    expect(remaining.reduce((sum, seg) => sum + seg.qty, 0)).toBe(8);
  });

  it('does not collapse to a negative-only axis when quantity sits in the above stack', () => {
    const domain = rccpChartYDomain([
      { __stackAbove: 14305, __stackBelow: -12 },
    ]);
    expect(domain[0]).toBeLessThan(0);
    expect(domain[1]).toBeGreaterThan(0);
  });

  it('shows the above stack when only quantity (ordered) is toggled on', () => {
    expect(rccpPoStackBarFlags({
      openVisible: false, orderedVisible: true, deliveredVisible: false,
    })).toEqual({ showAbove: true, showBelow: false });
    expect(rccpPoStackBarFlags({
      openVisible: false, orderedVisible: false, deliveredVisible: true,
    })).toEqual({ showAbove: true, showBelow: true });
  });

  it('detects the current week and month period', () => {
    const now = new Date('2026-03-18T12:00:00.000Z');
    const parts = isoWeekPartsUtc(now);
    expect(isCurrentMatrixPeriod({ key: parts.key, year: parts.year, week: parts.week }, now)).toBe(true);
    expect(isCurrentMatrixPeriod({ key: '2020-W01', year: 2020, week: 1 }, now)).toBe(false);
    expect(isCurrentMatrixPeriod({ key: '2026-M03', year: 2026, month: 3 }, now)).toBe(true);
    expect(isCurrentMatrixPeriod({ key: '2026-M02', year: 2026, month: 2 }, now)).toBe(false);
  });
});
