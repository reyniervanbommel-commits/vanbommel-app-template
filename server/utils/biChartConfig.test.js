import { describe, expect, it } from 'vitest';
import { normalizeConfig } from './biChartConfig.js';

describe('biChartConfig.normalizeConfig', () => {
  it('behoudt chart type line', () => {
    const result = normalizeConfig({
      type: 'line',
      dimension: 'vendor',
      measure: 'amount',
      aggregation: 'sum',
    });
    expect(result.type).toBe('line');
  });

  it('normaliseert chart type met hoofdletters', () => {
    const result = normalizeConfig({ type: 'Line', measure: 'amount', aggregation: 'sum' });
    expect(result.type).toBe('line');
  });

  it('bewaart measureStyles voor bar charts', () => {
    const result = normalizeConfig({
      type: 'bar',
      dimension: 'vendor',
      measures: ['amount', 'qty'],
      aggregation: 'sum',
      options: {
        measureStyles: { amount: 'bar', qty: 'line' },
      },
    });
    expect(result.options.measureStyles).toEqual({ amount: 'bar', qty: 'line' });
  });

  it('verwijdert measureStyles voor line charts', () => {
    const result = normalizeConfig({
      type: 'line',
      dimension: 'vendor',
      measures: ['amount'],
      options: { measureStyles: { amount: 'line' } },
    });
    expect(result.options.measureStyles).toEqual({});
  });

  it('bewaart colorMode, valueDisplay en unit', () => {
    const result = normalizeConfig({
      type: 'kpi',
      measure: 'amount',
      options: {
        colorMode: 'single',
        singleColor: '#579bfc',
        valueDisplay: 'percent',
        unit: 'EUR',
      },
    });
    expect(result.options.colorMode).toBe('single');
    expect(result.options.singleColor).toBe('#579bfc');
    expect(result.options.valueDisplay).toBe('percent');
    expect(result.options.unit).toBe('EUR');
  });

  it('behoudt een palette-kleur met opacity', () => {
    const result = normalizeConfig({
      type: 'kpi',
      measure: 'amount',
      options: { colorMode: 'single', singleColor: '#579bfcb3' },
    });
    expect(result.options.singleColor).toBe('#579bfcb3');
  });
});
