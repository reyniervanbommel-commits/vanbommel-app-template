import { describe, expect, it } from 'vitest';
import {
  todayLineX,
  stackRectLayout,
  isoWeekPartsUtc,
  RCCP_PO_BAR_SIZE,
  isReceivedPairHighlight,
} from './rccpPoStack';
import { RCCP_CHART_Y_AXIS_WIDTH, RCCP_WEEK_COL_WIDTH } from './rccpUtils';

describe('rccpPoStack', () => {
  it('uses 80% of the week column as bar width', () => {
    expect(RCCP_PO_BAR_SIZE).toBe(Math.round(RCCP_WEEK_COL_WIDTH * 0.8));
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

  it('highlights matching received segments of the same PO', () => {
    expect(isReceivedPairHighlight({ status: 'received', poNumber: 'PO-1' }, 'PO-1')).toBe(true);
    expect(isReceivedPairHighlight({ status: 'received', poNumber: 'PO-2' }, 'PO-1')).toBe(false);
    expect(isReceivedPairHighlight({ status: 'open', poNumber: 'PO-1' }, 'PO-1')).toBe(false);
    expect(isReceivedPairHighlight({ status: 'received', poNumber: 'PO-1' }, '')).toBe(false);
  });
});
