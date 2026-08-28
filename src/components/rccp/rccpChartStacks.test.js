import { describe, expect, it } from 'vitest';
import { applyPlanningDateAbove, buildRccpChartRows } from './rccpChartStacks';
import { RCCP_PO_BAR_SIZE } from './rccpPoStack';

describe('buildRccpChartRows', () => {
  const chart = [{
    key: '2026-W12',
    segmentsAbove: [
      { itemNumber: 'A', qty: 4, status: 'received' },
      { itemNumber: 'A', qty: 6, status: 'open' },
    ],
    segmentsBelow: [{ itemNumber: 'A', qty: 4, status: 'received' }],
    segmentsConfirmed: [
      { itemNumber: 'A', qty: 4, status: 'received' },
      { itemNumber: 'A', qty: 6, status: 'open' },
    ],
  }];

  it('filters stacks by visibility and uses measure colors', () => {
    const rows = buildRccpChartRows({
      chart, openVisible: true, deliveredVisible: true,
      openColor: '#D13438', receivedColor: '#0078D4',
    });
    expect(rows[0].segmentsAbove).toHaveLength(2);
    expect(rows[0].__stackAbove).toBe(10);
    expect(rows[0].__stackBelow).toBe(-4);
    expect(rows[0].__barWidthAbove).toBe(RCCP_PO_BAR_SIZE);
    expect(rows[0].__openColor).toBe('#D13438');
    expect(rows[0].__receivedColor).toBe('#0078D4');
    expect(rows[0].__stackConfirmed).toBeUndefined();
  });

  it('hides open segments when open is not visible', () => {
    const rows = buildRccpChartRows({
      chart, openVisible: false, deliveredVisible: true,
      openColor: '#D13438', receivedColor: '#0078D4',
    });
    expect(rows[0].segmentsAbove.every((s) => s.status !== 'open')).toBe(true);
  });
});

describe('applyPlanningDateAbove', () => {
  const chart = [{
    key: '2026-W12',
    segmentsAbove: [{ itemNumber: 'A', qty: 6, status: 'open' }],
    segmentsConfirmed: [
      { itemNumber: 'A', qty: 4, status: 'received' },
      { itemNumber: 'A', qty: 6, status: 'confirmed' },
    ],
  }];

  it('keeps requested-week stacks when planning date is requested', () => {
    expect(applyPlanningDateAbove(chart, 'requested')[0].segmentsAbove).toEqual(
      chart[0].segmentsAbove,
    );
  });

  it('puts confirmed-week open+received on the above-axis stack', () => {
    const next = applyPlanningDateAbove(chart, 'confirmed');
    expect(next[0].segmentsAbove).toEqual([
      { itemNumber: 'A', qty: 4, status: 'received' },
      { itemNumber: 'A', qty: 6, status: 'open' },
    ]);
  });
});
