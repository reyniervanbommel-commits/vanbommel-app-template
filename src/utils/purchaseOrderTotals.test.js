import { describe, expect, it } from 'vitest';
import {
  calculateHeaderColumnSums,
  calculateLineColumnSum,
  calculateLineColumnValues,
  formatLinkedLineValues,
  getLinkedLineValuePreview,
  isSummableHeaderColumn,
  isSummableLineColumn,
  toNumeric,
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

  it('keeps numeric zero instead of collapsing it to a dash', () => {
    expect(formatLinkedLineValues([0], 'number')).toBe('0');
    expect(formatLinkedLineValues([0, 0], 'number')).toBe('0');
    expect(getLinkedLineValuePreview([0], 'number')).toEqual({
      firstValue: '0',
      additionalCount: 0,
      allValuesLabel: '0',
    });
  });

  it('formats ISO datetime line values as dd/mm/yyyy for date and text columns', () => {
    const isoDates = ['2026-08-25T00:00:00.000Z', '2026-08-26T14:30:00'];
    expect(formatLinkedLineValues(isoDates, 'date', 'receiptDate')).toBe('25/08/2026, 26/08/2026');
    expect(formatLinkedLineValues(isoDates, 'text', 'prl_rd')).toBe('25/08/2026, 26/08/2026');
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

describe('toNumeric / calculateHeaderColumnSums', () => {
  it('parses numbers and comma decimals, skips invalid values', () => {
    expect(toNumeric(10)).toBe(10);
    expect(toNumeric('3,5')).toBe(3.5);
    expect(toNumeric('')).toBe(null);
    expect(toNumeric('x')).toBe(null);
  });

  it('sums header row values in one pass per requested key', () => {
    const rows = [
      { order: { values: { qty: 2, amount: '3,5' } } },
      { order: { values: { qty: '4', amount: null } } },
      { order: { values: { qty: 'x', amount: 1 } } },
    ];
    expect(calculateHeaderColumnSums(rows, ['qty', 'amount'])).toEqual({ qty: 6, amount: 4.5 });
  });

  it('returns zeros for empty rows and ignores non-header number columns', () => {
    expect(calculateHeaderColumnSums([], ['qty'])).toEqual({ qty: 0 });
    expect(isSummableHeaderColumn({ dataType: 'number' })).toBe(true);
    expect(isSummableHeaderColumn({ dataType: 'number', level: 'line' })).toBe(false);
    expect(isSummableHeaderColumn({ dataType: 'text' })).toBe(false);
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
