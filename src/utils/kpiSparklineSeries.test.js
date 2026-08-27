import { describe, it, expect } from 'vitest';
import {
  downsampleSeries,
  buildKpiSparklineSeries,
  buildKpiCompositionSeries,
  buildSparklineAreaPath,
  resolveKpiSparklines,
} from './kpiSparklineSeries';

describe('downsampleSeries', () => {
  it('keeps short series unchanged', () => {
    expect(downsampleSeries([1, 2, 3], 40)).toEqual([1, 2, 3]);
  });

  it('preserves first and last point when shrinking', () => {
    const values = Array.from({ length: 100 }, (_, i) => i);
    const next = downsampleSeries(values, 40);
    expect(next).toHaveLength(40);
    expect(next[0]).toBe(0);
    expect(next[39]).toBe(99);
  });
});

describe('buildKpiSparklineSeries', () => {
  const payload = {
    orders: {
      'PO-A': { o: 10, d: 4, tu: 2, lu: 4, yu: 8, ls: 14, ln: 1, ou: 10 },
      'PO-B': { o: 3, d: 0, tu: 0, ou: 3 },
      'PO-C': { o: 99, d: 99 },
    },
  };

  it('builds per-order ordered units in table order and skips missing orders', () => {
    expect(buildKpiSparklineSeries(payload, ['PO-A', 'PO-MISSING', 'PO-B'], 'ordered'))
      .toEqual([14, 3]);
  });

  it('uses valid planned units for the validDates sparkline', () => {
    expect(buildKpiSparklineSeries(payload, ['PO-A', 'PO-B'], 'validDates'))
      .toEqual([6, 3]);
  });

  it('uses on-time units for delivery reliability', () => {
    expect(buildKpiSparklineSeries(payload, ['PO-A', 'PO-B'], 'deliveryReliability'))
      .toEqual([2, 0]);
  });

  it('returns an empty series when every point is zero', () => {
    expect(buildKpiSparklineSeries(payload, ['PO-B'], 'delivered')).toEqual([]);
  });

  it('returns an empty series for capacity cards', () => {
    expect(buildKpiSparklineSeries(payload, ['PO-A'], 'capacityShortfall')).toEqual([]);
  });
});

describe('buildKpiCompositionSeries', () => {
  const kpis = {
    totalOrdered: 17,
    totalDelivered: 4,
    totalOpen: 13,
    lateDeliveryUnits: 4,
    onTimeUnits: 2,
    openLateUnits: 13,
    planned1900Units: 8,
    validPlannedUnits: 9,
  };

  it('splits ordered into delivered then open', () => {
    expect(buildKpiCompositionSeries(kpis, 'ordered')).toEqual([4, 13]);
  });

  it('splits valid dates into complete then 1-1-1900', () => {
    expect(buildKpiCompositionSeries(kpis, 'validDates')).toEqual([9, 8]);
  });

  it('splits delivery reliability into on-time then late', () => {
    expect(buildKpiCompositionSeries(kpis, 'deliveryReliability')).toEqual([2, 4]);
  });

  it('returns empty for capacity cards', () => {
    expect(buildKpiCompositionSeries(kpis, 'capacityShortfall')).toEqual([]);
  });

  it('prefers per-order series over composition when resolving sparklines', () => {
    const resolved = resolveKpiSparklines(kpis, { ordered: [1, 2, 3] });
    expect(resolved.ordered).toEqual({ values: [1, 2, 3], variant: 'area' });
    expect(resolved.validDates).toEqual({ values: [9, 8], variant: 'bar' });
  });
});

describe('buildSparklineAreaPath', () => {
  it('builds a closed area from baseline to the values', () => {
    const { line, area } = buildSparklineAreaPath([0, 10, 5], 100, 40);
    expect(line.startsWith('M')).toBe(true);
    expect(area.endsWith('Z')).toBe(true);
    expect(area).toContain(line);
  });
});
