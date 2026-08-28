import { describe, expect, it } from 'vitest';
import {
  todayLineX,
  todayBand,
  stackRectLayout,
  isoWeekPartsUtc,
  RCCP_PO_BAR_SIZE,
  weekBarBox,
  isRccpItemHighlight,
  isCurrentMatrixPeriod,
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

  it('splits left and right slots inside 80% of the week band', () => {
    const left = weekBarBox(0, RCCP_PO_BAR_SIZE, 'left');
    const right = weekBarBox(0, RCCP_PO_BAR_SIZE, 'right');
    const center = weekBarBox(0, RCCP_PO_BAR_SIZE, 'center');
    expect(left.x + left.width).toBeLessThan(right.x);
    expect(right.x + right.width).toBeLessThanOrEqual(center.x + center.width + 0.5);
    expect(left.width + right.width).toBeLessThan(RCCP_WEEK_COL_WIDTH * 0.85);
  });

  it('keeps center slot as the current centered bar', () => {
    expect(weekBarBox(0, RCCP_PO_BAR_SIZE)).toEqual(weekBarBox(0, RCCP_PO_BAR_SIZE, 'center'));
  });

  it('returns null for todayLineX when the current week is outside the window', () => {
    const periods = [{ key: '2020-W01', year: 2020, week: 1 }];
    expect(todayLineX(periods, new Date('2026-03-16T00:00:00.000Z'))).toBeNull();
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

  it('highlights every segment of the hovered item', () => {
    expect(isRccpItemHighlight({ status: 'received', itemNumber: 'SKU-1' }, 'SKU-1')).toBe(true);
    expect(isRccpItemHighlight({ status: 'open', itemNumber: 'SKU-1' }, 'SKU-1')).toBe(true);
    expect(isRccpItemHighlight({ status: 'received', itemNumber: 'SKU-2' }, 'SKU-1')).toBe(false);
    expect(isRccpItemHighlight({ status: 'open', itemNumber: 'SKU-1' }, '')).toBe(false);
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
