'use strict';

const {
  MAX_DETAIL_PATCHES,
  planFanout,
  remainingValuesAfterPass,
  isBusinessWriteBackError,
  isInfraWriteBackError,
} = require('./detailCorrectionFanout');
const { valuesEqualForConcurrency } = require('./odataValueEquals');

const eq = (a, b) => valuesEqualForConcurrency(a, b, 'text');

describe('planFanout', () => {
  it('skips equal values and counts patches', () => {
    const plan = planFanout({
      lines: [
        { detailKey: 1, values: { color: 'Red' }, removed: false },
        { detailKey: 2, values: { color: 'Blue' }, removed: false },
        { detailKey: 3, values: { color: 'Red' }, removed: true },
      ],
      columnKey: 'color',
      targetValue: 'Red',
      valuesEqual: eq,
    });
    expect(plan.skipped).toEqual([1]);
    expect(plan.toPatch.map((l) => l.detailKey)).toEqual([2]);
    expect(plan.tooMany).toBe(false);
  });

  it('sets tooMany when patch count exceeds cap', () => {
    const lines = Array.from({ length: MAX_DETAIL_PATCHES + 1 }, (_, i) => ({
      detailKey: i + 1, values: { color: 'A' }, removed: false,
    }));
    expect(planFanout({
      lines, columnKey: 'color', targetValue: 'B', valuesEqual: eq,
    }).tooMany).toBe(true);
  });
});

describe('remainingValuesAfterPass', () => {
  it('uses target for updated lines and old value for failed', () => {
    const remaining = remainingValuesAfterPass({
      lines: [
        { detailKey: 1, values: { color: 'Red' } },
        { detailKey: 2, values: { color: 'Blue' } },
      ],
      columnKey: 'color',
      targetValue: 'Green',
      updatedDetailKeys: [1],
      failedDetailKeys: [2],
    });
    expect(remaining).toEqual(['Green', 'Blue']);
  });
});

describe('error class', () => {
  it('classifies 409 as business and 502 as infra', () => {
    expect(isBusinessWriteBackError({ status: 409 })).toBe(true);
    expect(isInfraWriteBackError({ status: 502 })).toBe(true);
    expect(isInfraWriteBackError({ status: 409 })).toBe(false);
  });
});
