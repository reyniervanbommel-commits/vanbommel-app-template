'use strict';

const { isAllowedDatePeriodSource } = require('./datePeriodColumn');

describe('isAllowedDatePeriodSource', () => {
  it('accepts a native date column', () => {
    expect(isAllowedDatePeriodSource({ sourceDataType: 'date' })).toBe(true);
  });

  it('rejects a plain text column without a line-value link', () => {
    expect(isAllowedDatePeriodSource({ sourceDataType: 'text' })).toBe(false);
  });

  it('accepts a push-to-header text column linked to a date line column', () => {
    expect(isAllowedDatePeriodSource({
      sourceDataType: 'text',
      linkedLineColumn: { key: 'receiptDate', label: 'Receipt date', dataType: 'date' },
    })).toBe(true);
  });

  it('accepts a pushed receipt-date header when the line column is text but date-like', () => {
    expect(isAllowedDatePeriodSource({
      sourceDataType: 'text',
      linkedLineColumn: { key: 'receiptDate', label: 'Receipt date (Ontvangstregels)', dataType: 'text' },
    })).toBe(true);
  });

  it('rejects a pushed text column linked to a non-date line column', () => {
    expect(isAllowedDatePeriodSource({
      sourceDataType: 'text',
      linkedLineColumn: { key: 'color', label: 'Color', dataType: 'text' },
    })).toBe(false);
  });
});
