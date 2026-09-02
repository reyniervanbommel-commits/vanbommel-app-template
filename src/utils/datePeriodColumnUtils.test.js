import { describe, expect, it } from 'vitest';
import {
  columnUsesNumberSemantics,
  DATE_PERIOD_DISPLAY_MODES,
  formatDatePeriodValue,
  isDatePeriodColumn,
  listDateColumns,
  normalizeDatePeriodDisplayMode,
  parseDateValueForPeriod,
  resolveDatePeriodCellValue,
} from './datePeriodColumnUtils';

describe('datePeriodColumnUtils', () => {
  it('detects date period columns', () => {
    expect(isDatePeriodColumn({ dataType: 'date_period' })).toBe(true);
    expect(isDatePeriodColumn({ dataType: 'text' })).toBe(false);
  });

  it('formats ISO week numbers', () => {
    expect(formatDatePeriodValue('2026-07-15', DATE_PERIOD_DISPLAY_MODES.week)).toBe('29');
  });

  it('formats English month names', () => {
    expect(formatDatePeriodValue('2026-07-15', DATE_PERIOD_DISPLAY_MODES.month)).toBe('July');
  });

  it('parses ISO datetime values', () => {
    const parsed = parseDateValueForPeriod('2021-11-08T00:00:00.000Z');
    expect(parsed?.getFullYear()).toBe(2021);
    expect(parsed?.getMonth()).toBe(10);
    expect(parsed?.getDate()).toBe(8);
  });

  it('derives cell values from the configured source column', () => {
    const column = {
      dataType: 'date_period',
      key: 'deliveryWeek',
      options: { sourceColumnKey: 'requestedDeliveryDate' },
    };
    const values = { requestedDeliveryDate: '2026-07-15' };
    expect(resolveDatePeriodCellValue(column, values, 'week')).toBe('29');
    expect(resolveDatePeriodCellValue(column, values, 'month')).toBe('July');
  });

  it('normalizes display mode fallback to week', () => {
    expect(normalizeDatePeriodDisplayMode('month')).toBe('month');
    expect(normalizeDatePeriodDisplayMode('unknown')).toBe('week');
  });

  it('uses numeric semantics for date period week columns', () => {
    const column = {
      dataType: 'date_period',
      key: 'deliveryWeek',
      options: { sourceColumnKey: 'requestedDeliveryDate' },
    };
    expect(columnUsesNumberSemantics(column, { deliveryWeek: 'week' })).toBe(true);
    expect(columnUsesNumberSemantics(column, { deliveryWeek: 'month' })).toBe(false);
    expect(columnUsesNumberSemantics(column)).toBe(true);
  });

  it('lists native date columns as Date W/M sources', () => {
    const columns = [
      { key: 'leverdatum', label: 'Leverdatum', dataType: 'date' },
      { key: 'status', label: 'Status', dataType: 'text' },
      { key: 'weekCol', label: 'Date W/M', dataType: 'date_period', options: { sourceColumnKey: 'leverdatum' } },
    ];
    expect(listDateColumns(columns).map((column) => column.key)).toEqual(['leverdatum']);
  });

  it('lists a push-to-header date column even when the header is stored as text', () => {
    const columns = [
      { key: 'leverdatum', label: 'Leverdatum', dataType: 'date' },
      { key: 'receiptDateValues', label: 'Receipt date', dataType: 'text', source: 'custom' },
      { key: 'colorValues', label: 'Color Values', dataType: 'text', source: 'custom' },
    ];
    const listed = listDateColumns(columns, {
      lineColumns: [
        { key: 'receiptDate', label: 'Receipt date', dataType: 'date' },
        { key: 'color', label: 'Color', dataType: 'text' },
      ],
      lineValueHeaderLinks: [
        { lineColumnKey: 'receiptDate', headerColumnKey: 'receiptDateValues' },
        { lineColumnKey: 'color', headerColumnKey: 'colorValues' },
      ],
    });
    expect(listed.map((column) => column.key)).toEqual(['leverdatum', 'receiptDateValues']);
  });

  it('lists a pushed receipt-date header when the line column is text but date-like', () => {
    const columns = [
      { key: 'receiptDateValues', label: 'Receipt date (Ontvangstdatum)', dataType: 'text', source: 'custom' },
    ];
    const listed = listDateColumns(columns, {
      lineColumns: [{ key: 'receiptDate', label: 'Receipt date', dataType: 'text' }],
      lineValueHeaderLinks: [{ lineColumnKey: 'receiptDate', headerColumnKey: 'receiptDateValues' }],
    });
    expect(listed.map((column) => column.key)).toEqual(['receiptDateValues']);
  });

  it('lists a renamed date-like text header even without a push-to-header link', () => {
    const columns = [
      { key: 'receipt_date_values', label: 'Receipt date (Ontvangstdatum)', dataType: 'text', source: 'custom' },
      { key: 'colorValues', label: 'Color Values', dataType: 'text', source: 'custom' },
    ];
    expect(listDateColumns(columns).map((column) => column.key)).toEqual(['receipt_date_values']);
  });

  it('derives week/month from the first unique pushed line date', () => {
    const column = {
      dataType: 'date_period',
      key: 'receiptWeek',
      options: { sourceColumnKey: 'receiptDateValues' },
    };
    const values = { receiptDateValues: '03/08/2026, 05/06/2026' };
    const linkedLineValues = { receiptDateValues: ['2026-08-03T00:00:00.000Z', '2026-06-05T00:00:00.000Z'] };
    expect(resolveDatePeriodCellValue(column, values, 'week', linkedLineValues)).toBe('32');
    expect(resolveDatePeriodCellValue(column, values, 'month', linkedLineValues)).toBe('August');
  });
});
