import { describe, it, expect } from 'vitest';
import { formatCellValue, formatSyncedAt } from './purchaseOrderFormat';

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
});

describe('formatSyncedAt', () => {
  it('geeft null zonder waarde of bij een ongeldige datum', () => {
    expect(formatSyncedAt(null)).toBeNull();
    expect(formatSyncedAt(undefined)).toBeNull();
    expect(formatSyncedAt('not-a-date')).toBeNull();
  });

  it('geeft "just now" voor een tijdstip net geleden', () => {
    expect(formatSyncedAt(new Date(Date.now() - 10 * 1000).toISOString())).toBe('just now');
  });

  it('geeft "X min ago" binnen het uur', () => {
    expect(formatSyncedAt(new Date(Date.now() - 5 * 60 * 1000).toISOString())).toBe('5 min ago');
  });

  it('geeft "X hours ago" binnen de 24 uur', () => {
    expect(formatSyncedAt(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())).toBe('3 hours ago');
  });

  it('valt terug op een volledige NL-datum/tijd-notatie na 24 uur', () => {
    const result = formatSyncedAt(new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString());
    expect(result).not.toMatch(/ago|just now/);
    expect(result).toMatch(/\d{2}.\d{2}.\d{4}.*\d{2}:\d{2}/);
  });
});
