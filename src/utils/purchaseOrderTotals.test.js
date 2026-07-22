import { describe, expect, it } from 'vitest';
import {
  calculateLineColumnSum,
  calculateLineColumnValues,
  formatLinkedLineValues,
  getLinkedLineValuePreview,
  isSummableLineColumn,
} from './purchaseOrderTotals';

describe('formatLinkedLineValues', () => {
  it('joins unique, formatted values with a comma', () => {
    expect(formatLinkedLineValues(['ITEM-1', 'ITEM-2', 'ITEM-1'], 'text')).toBe('ITEM-1, ITEM-2');
  });

  it('returns a single value without a separator', () => {
    expect(formatLinkedLineValues(['ITEM-1'], 'text')).toBe('ITEM-1');
  });

  it('returns "-" when there are no values', () => {
    expect(formatLinkedLineValues([], 'text')).toBe('-');
    expect(formatLinkedLineValues(null, 'text')).toBe('-');
  });
});

describe('getLinkedLineValuePreview', () => {
  it('returns the first unique value with the count of additional unique values', () => {
    expect(getLinkedLineValuePreview(['ITEM-1', 'ITEM-2', 'ITEM-1', 'ITEM-3'], 'text')).toEqual({
      firstValue: 'ITEM-1',
      additionalCount: 2,
      allValuesLabel: 'ITEM-1, ITEM-2, ITEM-3',
    });
  });

  it('reports no additional values when only one unique value exists', () => {
    expect(getLinkedLineValuePreview(['ITEM-1', 'ITEM-1'], 'text')).toEqual({
      firstValue: 'ITEM-1',
      additionalCount: 0,
      allValuesLabel: 'ITEM-1',
    });
  });

  it('falls back to a dash preview when there are no values', () => {
    expect(getLinkedLineValuePreview([], 'text')).toEqual({
      firstValue: '-',
      additionalCount: 0,
      allValuesLabel: '-',
    });
    expect(getLinkedLineValuePreview(null, 'text')).toEqual({
      firstValue: '-',
      additionalCount: 0,
      allValuesLabel: '-',
    });
  });

  it('stays consistent with formatLinkedLineValues for the same input', () => {
    const rawValues = ['B', 'A', 'B', 'C'];
    const preview = getLinkedLineValuePreview(rawValues, 'text');
    const joined = formatLinkedLineValues(rawValues, 'text');
    expect(joined).toBe(preview.allValuesLabel);
  });
});

describe('calculateLineColumnValues', () => {
  it('formats and deduplicates values straight from line objects', () => {
    const lines = [
      { values: { itemNumber: 'ITEM-1' } },
      { values: { itemNumber: 'ITEM-2' } },
      { values: { itemNumber: 'ITEM-1' } },
    ];
    expect(calculateLineColumnValues(lines, 'itemNumber', 'text')).toBe('ITEM-1, ITEM-2');
  });
});

describe('calculateLineColumnSum / isSummableLineColumn', () => {
  it('sums numeric line values only', () => {
    const lines = [
      { values: { qty: 2 } },
      { values: { qty: '3' } },
      { values: { qty: null } },
    ];
    expect(calculateLineColumnSum(lines, 'qty')).toBe(5);
  });

  it('only treats number columns as summable', () => {
    expect(isSummableLineColumn({ dataType: 'number' })).toBe(true);
    expect(isSummableLineColumn({ dataType: 'text' })).toBe(false);
  });
});
