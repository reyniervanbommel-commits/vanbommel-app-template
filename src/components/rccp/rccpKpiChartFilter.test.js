import { describe, expect, it } from 'vitest';
import {
  RCCP_CLICKABLE_KPI_KEYS,
  buildRccpKpiMatrixHighlight,
  filterRccpChartByKpi,
} from './rccpKpiChartFilter';

function point(key, above = [], below = [], extra = {}) {
  return { key, segmentsAbove: above, segmentsBelow: below, ...extra };
}

const chart = [
  point('2026-W10', [
    { itemNumber: 'A', qty: 8, status: 'open', late: false },
    { itemNumber: 'A', qty: 2, status: 'received', late: false },
  ], [
    { itemNumber: 'A', qty: 2, status: 'received', late: false, onTime: true },
  ]),
  point('2026-W11', [
    { itemNumber: 'B', qty: 5, status: 'open', late: true },
    { itemNumber: 'B', qty: 3, status: 'received', late: false, planned1900: true },
  ], [
    { itemNumber: 'B', qty: 4, status: 'received', late: true, onTime: false },
  ], { __overloaded__: true }),
  point('2026-W12', [], [], { __overloaded__: false }),
];

const measureRows = [
  { measureKey: 'ordered' },
  { measureKey: 'open', isOpen: true },
  { measureKey: 'delivered', isDelivered: true },
  { measureKey: '__overcapacity__', isOvercapacity: true },
];

describe('RCCP_CLICKABLE_KPI_KEYS', () => {
  it('includes PO-board KPIs plus capacity cards', () => {
    expect(RCCP_CLICKABLE_KPI_KEYS).toContain('open');
    expect(RCCP_CLICKABLE_KPI_KEYS).toContain('lateDelivery');
    expect(RCCP_CLICKABLE_KPI_KEYS).toContain('capacityShortfall');
    expect(RCCP_CLICKABLE_KPI_KEYS).toContain('overloadedWeeks');
  });
});

describe('filterRccpChartByKpi', () => {
  it('keeps every segment when no KPI is selected', () => {
    expect(filterRccpChartByKpi(chart, null)).toBe(chart);
  });

  it('keeps open and received segments for total ordered', () => {
    const [week10] = filterRccpChartByKpi(chart, 'ordered');
    expect(week10.segmentsAbove).toHaveLength(2);
    expect(week10.segmentsBelow).toHaveLength(1);
  });

  it('keeps only received segments for delivered', () => {
    const [week10, week11] = filterRccpChartByKpi(chart, 'delivered');
    expect(week10.segmentsAbove).toEqual([
      { itemNumber: 'A', qty: 2, status: 'received', late: false },
    ]);
    expect(week10.segmentsBelow).toHaveLength(1);
    expect(week11.segmentsAbove.every((seg) => seg.status === 'received')).toBe(true);
  });

  it('keeps only open segments for total open', () => {
    const [week10, week11] = filterRccpChartByKpi(chart, 'open');
    expect(week10.segmentsAbove).toEqual([
      { itemNumber: 'A', qty: 8, status: 'open', late: false },
    ]);
    expect(week10.segmentsBelow).toEqual([]);
    expect(week11.segmentsAbove).toEqual([
      { itemNumber: 'B', qty: 5, status: 'open', late: true },
    ]);
  });

  it('keeps only late open segments for open and late', () => {
    const [, week11] = filterRccpChartByKpi(chart, 'openLate');
    expect(week11.segmentsAbove).toEqual([
      { itemNumber: 'B', qty: 5, status: 'open', late: true },
    ]);
    expect(week11.segmentsBelow).toEqual([]);
  });

  it('keeps late receipts for late delivery', () => {
    const [week10, week11] = filterRccpChartByKpi(chart, 'lateDelivery');
    expect(week10.segmentsAbove).toEqual([]);
    expect(week10.segmentsBelow).toEqual([]);
    expect(week11.segmentsBelow).toEqual([
      { itemNumber: 'B', qty: 4, status: 'received', late: true, onTime: false },
    ]);
  });

  it('keeps on-time receipts for on time delivery', () => {
    const [week10] = filterRccpChartByKpi(chart, 'onTime');
    expect(week10.segmentsAbove).toEqual([]);
    expect(week10.segmentsBelow).toEqual([
      { itemNumber: 'A', qty: 2, status: 'received', late: false, onTime: true },
    ]);
  });

  it('keeps planned-1900 segments', () => {
    const [, week11] = filterRccpChartByKpi(chart, 'planned1900');
    expect(week11.segmentsAbove).toEqual([
      { itemNumber: 'B', qty: 3, status: 'received', late: false, planned1900: true },
    ]);
  });

  it('does not strip stacks for capacity KPIs', () => {
    expect(filterRccpChartByKpi(chart, 'overloadedWeeks')[0].segmentsAbove).toHaveLength(2);
  });
});

describe('buildRccpKpiMatrixHighlight', () => {
  it('returns empty highlight when no KPI is selected', () => {
    expect(buildRccpKpiMatrixHighlight(chart, measureRows, null)).toEqual({
      weeks: [],
      measureKeys: [],
    });
  });

  it('highlights open-row weeks that still have open segments', () => {
    expect(buildRccpKpiMatrixHighlight(chart, measureRows, 'open')).toEqual({
      weeks: ['2026-W10', '2026-W11'],
      measureKeys: ['open'],
    });
  });

  it('highlights delivered-row weeks with late receipts', () => {
    expect(buildRccpKpiMatrixHighlight(chart, measureRows, 'lateDelivery')).toEqual({
      weeks: ['2026-W11'],
      measureKeys: ['delivered'],
    });
  });

  it('highlights overloaded weeks on the overcapacity row', () => {
    expect(buildRccpKpiMatrixHighlight(chart, measureRows, 'overloadedWeeks')).toEqual({
      weeks: ['2026-W11'],
      measureKeys: ['__overcapacity__'],
    });
  });
});
