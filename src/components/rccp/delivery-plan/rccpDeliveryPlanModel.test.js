import { describe, expect, it } from 'vitest';
import {
  buildChartModel,
  formatDelayLabel,
  formatDetailLine,
  formatVarianceText,
  weekColor,
} from './rccpDeliveryPlanModel';

describe('rccpDeliveryPlanModel', () => {
  const weeks = [
    { year: 2026, week: 10, key: '2026-W10' },
    { year: 2026, week: 11, key: '2026-W11' },
    { year: 2026, week: 12, key: '2026-W12' },
  ];

  it('keeps week colour stable for the same year-Wxx key', () => {
    expect(weekColor(2026, 10)).toBe(weekColor(2026, 10));
    expect(weekColor(2026, 10)).not.toBe(weekColor(2026, 11));
  });

  it('never formats a 0w delay', () => {
    expect(formatDelayLabel(0)).toBe('');
    expect(formatDelayLabel(null)).toBe('');
    expect(formatDelayLabel(1)).toBe('+1w');
    expect(formatDelayLabel(-1)).toBe('−1w');
    expect(formatVarianceText(0)).toBe('');
  });

  it('groups planning and receipt segments and marks overdue open qty', () => {
    const model = buildChartModel([
      {
        orderId: 'PO-1|1',
        purchaseOrderNumber: 'PO-1',
        lineNumber: '1',
        orderedQty: 10,
        deliveredQty: 4,
        openQty: 6,
        plannedDate: '2026-03-02T00:00:00.000Z',
        deliveredDate: '2026-03-16T00:00:00.000Z',
        delayWeeks: 2,
      },
    ], weeks, { '2026-W10': 8 }, new Date('2026-03-20T00:00:00.000Z'));

    const planWeek = model.points[0];
    expect(planWeek.planningTotal).toBe(10);
    expect(planWeek.planningSegments.map((s) => s.type)).toEqual(['delivered', 'open']);
    expect(planWeek.planningSegments[1].overdue).toBe(true);
    expect(planWeek.overCapacity).toBe(2);

    const receiptWeek = model.points[2];
    expect(receiptWeek.receiptTotal).toBe(4);
    expect(receiptWeek.receiptSegments[0].color).toBe(planWeek.color);
  });

  it('omits capacity overflow when the week has no capacity row', () => {
    const model = buildChartModel([{
      orderId: 'PO-2|1',
      purchaseOrderNumber: 'PO-2',
      lineNumber: '1',
      orderedQty: 5,
      deliveredQty: 0,
      openQty: 5,
      plannedDate: '2026-03-02T00:00:00.000Z',
      deliveredDate: null,
      delayWeeks: null,
    }], weeks, {}, new Date('2026-03-02T00:00:00.000Z'));
    expect(model.points[0].capacity).toBeNull();
    expect(model.points[0].overCapacity).toBe(0);
  });

  it('builds an English detail line without 0w', () => {
    const line = formatDetailLine({
      purchaseOrderNumber: 'PO-9',
      lineNumber: '3',
      orderedQty: 10,
      deliveredQty: 10,
      openQty: 0,
      plannedDate: '2026-03-02T00:00:00.000Z',
      deliveredDate: '2026-03-02T00:00:00.000Z',
      delayWeeks: 0,
    });
    expect(line).toContain('PO-9');
    expect(line).toContain('line 3');
    expect(line).not.toContain('0w');
    expect(line).not.toContain('week(s)');
  });
});
