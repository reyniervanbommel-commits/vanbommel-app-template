import { describe, expect, it } from 'vitest';
import { applyRccpPlanningDateView } from './rccpPlanningDateView';

const analysis = {
  cells: [
    {
      measureKey: '__overcapacity__', periodYear: 2026, isoWeek: 12,
      availableQty: 40, confirmedQty: 10, remainingQty: 10,
      statusColor: 'green', statusLabel: 'OK',
    },
    {
      measureKey: '__confirmed_delivery__', periodYear: 2026, isoWeek: 12,
      confirmedQty: 50,
    },
  ],
  chart: [{
    key: '2026-W12', year: 2026, week: 12,
    __capacity__: 40, __overcapacity__: 10, __overloaded__: false,
    segmentsAbove: [{ itemNumber: 'A', qty: 6, status: 'open' }],
    segmentsConfirmed: [{ itemNumber: 'A', qty: 6, status: 'open' }],
  }],
  kpis: { totalOpen: 6, capacityShortfall: 0, overloadedWeeks: 0 },
  kpisAll: { totalOpen: 6 },
  kpisConfirmed: { totalOpen: 6, planned1900Units: 2 },
  kpisAllConfirmed: { totalOpen: 6, planned1900Units: 2 },
};

describe('applyRccpPlanningDateView', () => {
  it('keeps the requested analysis unchanged', () => {
    expect(applyRccpPlanningDateView(analysis, 'requested')).toBe(analysis);
  });

  it('subtracts confirmed-delivery load from capacity when confirmed', () => {
    const next = applyRccpPlanningDateView(analysis, 'confirmed');
    expect(next.cells[0].confirmedQty).toBe(-10);
    expect(next.cells[0].statusColor).toBe('red');
    expect(next.chart[0].__overcapacity__).toBe(-10);
    expect(next.chart[0].__overloaded__).toBe(true);
    expect(next.kpis.capacityShortfall).toBe(10);
    expect(next.kpis.overloadedWeeks).toBe(1);
    expect(next.kpis.planned1900Units).toBe(2);
    expect(next.chart[0].segmentsAbove).toEqual(analysis.chart[0].segmentsAbove);
  });

  it('turns overcapacity green only from +1 surplus', () => {
    const even = applyRccpPlanningDateView({
      ...analysis,
      cells: [
        {
          measureKey: '__overcapacity__', periodYear: 2026, isoWeek: 12,
          availableQty: 50, confirmedQty: 0, remainingQty: 0,
          statusColor: 'green', statusLabel: 'OK',
        },
        {
          measureKey: '__confirmed_delivery__', periodYear: 2026, isoWeek: 12,
          confirmedQty: 50,
        },
      ],
    }, 'confirmed');
    expect(even.cells[0].confirmedQty).toBe(0);
    expect(even.cells[0].statusColor).toBe('grey');

    const surplus = applyRccpPlanningDateView({
      ...analysis,
      cells: [
        {
          measureKey: '__overcapacity__', periodYear: 2026, isoWeek: 12,
          availableQty: 51, confirmedQty: 0, remainingQty: 0,
          statusColor: 'grey', statusLabel: 'Even',
        },
        {
          measureKey: '__confirmed_delivery__', periodYear: 2026, isoWeek: 12,
          confirmedQty: 50,
        },
      ],
    }, 'confirmed');
    expect(surplus.cells[0].confirmedQty).toBe(1);
    expect(surplus.cells[0].statusColor).toBe('green');
  });
});
