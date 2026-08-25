import { describe, it, expect } from 'vitest';
import { formatCellValue, formatSyncedAt, isDateLikeCellValue } from './purchaseOrderFormat';

describe('formatCellValue', () => {
  it('geeft een streepje voor null, undefined en lege string', () => {
    expect(formatCellValue(null, 'string')).toBe('-');
    expect(formatCellValue(undefined, 'string')).toBe('-');
    expect(formatCellValue('', 'string')).toBe('-');
  });

  it('formatteert een Date-object als dd/mm/yyyy voor dataType date', () => {
    expect(formatCellValue(new Date(2026, 0, 5), 'date')).toBe('05/01/2026');
  });

  it('formatteert een ISO-datumstring als dd/mm/yyyy voor dataType datetime', () => {
    expect(formatCellValue('2026-03-14T10:30:00', 'datetime')).toBe('14/03/2026');
  });

  it('herkent waarschijnlijke datumkolommen op basis van de kolomnaam, ook zonder expliciet dataType', () => {
    expect(formatCellValue('2026-07-01', undefined, { columnKey: 'deliveryDate' })).toBe('01/07/2026');
  });

  it('past géén datumformattering toe voor dataType date_period, ook niet op een ISO-achtige waarde', () => {
    expect(formatCellValue('2026-07-01', 'date_period', { columnKey: 'deliveryDate' })).toBe('2026-07-01');
  });

  it('formatteert een getal met NL-duizendtalscheiding', () => {
    expect(formatCellValue(12345, 'number')).toBe('12.345');
  });

  it('geeft de ruwe waarde terug als getal-parsing faalt', () => {
    expect(formatCellValue('not-a-number', 'number')).toBe('not-a-number');
  });

  it('formatteert booleans als Yes/No', () => {
    expect(formatCellValue(true, 'boolean')).toBe('Yes');
    expect(formatCellValue(false, 'boolean')).toBe('No');
  });

  it('valt terug op String(value) voor onbekende/ontbrekende dataTypes', () => {
    expect(formatCellValue('plain text', 'string')).toBe('plain text');
    expect(formatCellValue(42, undefined)).toBe('42');
  });

  it('formatteert ISO-datums met tijd als dd/mm/yyyy, ook voor dataType text', () => {
    expect(formatCellValue('2026-08-25T00:00:00.000Z', 'text')).toBe('25/08/2026');
    expect(formatCellValue('2026-08-25T14:30:00', 'string')).toBe('25/08/2026');
  });

  it('formatteert komma-gescheiden ISO-datums elk als dd/mm/yyyy', () => {
    expect(formatCellValue(
      '2026-08-25T00:00:00.000Z, 2026-08-26T00:00:00.000Z',
      'text',
    )).toBe('25/08/2026, 26/08/2026');
  });
});

describe('isDateLikeCellValue', () => {
  it('herkent ISO-datums, Date-objecten en kommagescheiden ISO-lijsten', () => {
    expect(isDateLikeCellValue('2026-08-25T00:00:00.000Z')).toBe(true);
    expect(isDateLikeCellValue('2026-08-25T00:00:00.000Z, 2026-08-26T00:00:00.000Z')).toBe(true);
    expect(isDateLikeCellValue(new Date(2026, 7, 25))).toBe(true);
    expect(isDateLikeCellValue('Red')).toBe(false);
    expect(isDateLikeCellValue('')).toBe(false);
  });
});

describe('formatSyncedAt', () => {
  it('geeft null zonder waarde of bij een ongeldige datum', () => {
    expect(formatSyncedAt(null)).toBeNull();
    expect(formatSyncedAt(undefined)).toBeNull();
    expect(formatSyncedAt('not-a-date')).toBeNull();
  });

  it('toont datum en uur, zonder minuten', () => {
    const value = new Date(2026, 7, 23, 15, 37, 12);
    expect(formatSyncedAt(value)).toBe('23/08/2026 15:00');
    expect(formatSyncedAt(value.toISOString())).toBe('23/08/2026 15:00');
  });
});
