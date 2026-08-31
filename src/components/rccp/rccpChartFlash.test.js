import { describe, expect, it } from 'vitest';
import { rccpChartFlashSignature } from './rccpChartFlash';

describe('rccpChartFlashSignature', () => {
  it('stays stable when stacks do not change', () => {
    const chart = [{
      segmentsAbove: [{ qty: 2, status: 'open' }],
      segmentsBelow: [{ qty: 1, status: 'received' }],
    }];
    expect(rccpChartFlashSignature(chart)).toBe(rccpChartFlashSignature(chart));
    expect(rccpChartFlashSignature(chart)).toBe('1:2:3');
  });

  it('changes when a filter drops stacks', () => {
    const full = [{
      segmentsAbove: [{ qty: 2 }, { qty: 3 }],
      segmentsBelow: [{ qty: 1 }],
    }];
    const filtered = [{
      segmentsAbove: [{ qty: 2 }],
      segmentsBelow: [],
    }];
    expect(rccpChartFlashSignature(full)).not.toBe(rccpChartFlashSignature(filtered));
  });
});
