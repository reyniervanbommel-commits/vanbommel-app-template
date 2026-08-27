import { describe, expect, it } from 'vitest';
import { buildRccpChartRows } from './rccpChartStacks';
import { RCCP_PO_BAR_SIZE } from './rccpPoStack';

describe('buildRccpChartRows', () => {
  const chart = [{
    key: '2026-W12',
    segmentsAbove: [
      { itemNumber: 'A', qty: 4, status: 'received' },
      { itemNumber: 'A', qty: 6, status: 'open' },
    ],
    segmentsBelow: [{ itemNumber: 'A', qty: 4, status: 'received' }],
    segmentsConfirmed: [{ itemNumber: 'A', qty: 6, status: 'confirmed' }],
  }];

  it('filters stacks by visibility and preserves confirmed segments', () => {
    const rows = buildRccpChartRows({
      chart, openVisible: true, deliveredVisible: true,
      openColor: '#D13438', receivedColor: '#0078D4',
    });
    expect(rows[0].segmentsAbove).toHaveLength(2);
    expect(rows[0].__stackAbove).toBe(10);
    expect(rows[0].__stackBelow).toBe(-4);
    expect(rows[0].segmentsConfirmed).toEqual(chart[0].segmentsConfirmed);
    expect(rows[0].__barWidthAbove).toBe(RCCP_PO_BAR_SIZE);
    expect(rows[0].__openColor).toBe('#D13438');
  });

  it('hides open segments when open is not visible', () => {
    const rows = buildRccpChartRows({
      chart, openVisible: false, deliveredVisible: true,
      openColor: '#D13438', receivedColor: '#0078D4',
    });
    expect(rows[0].segmentsAbove.every((s) => s.status !== 'open')).toBe(true);
  });
});
