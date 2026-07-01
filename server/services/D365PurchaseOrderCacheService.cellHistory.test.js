'use strict';

const { formatHistoryRow } = require('./D365PurchaseOrderCacheService');

describe('D365PurchaseOrderCacheService.formatHistoryRow', () => {
  it('normaliseert een eigen-kolom-insert (alleen tekst-nieuw)', () => {
    const out = formatHistoryRow({
      source: 'custom', action: 'insert', at: new Date('2026-06-30T10:15:00Z'),
      old_value_text: null, old_value_number: null, old_value_date: null,
      new_value_text: 'Akkoord', new_value_number: null, new_value_date: null,
      status: null, change_reason: null, user_email: 'a@b.nl', user_name: 'Anna',
    });
    expect(out.source).toBe('custom');
    expect(out.action).toBe('insert');
    expect(out.oldValue).toBeNull();
    expect(out.newValue).toBe('Akkoord');
    expect(out.at).toBe('2026-06-30T10:15:00.000Z');
    expect(out.user).toEqual({ name: 'Anna', email: 'a@b.nl' });
    expect(out.status).toBeNull();
  });

  it('kiest de numerieke waarde uit het getypeerde triplet', () => {
    const out = formatHistoryRow({
      source: 'custom', action: 'update', at: '2026-06-30T10:15:00.000Z',
      old_value_text: null, old_value_number: 10, old_value_date: null,
      new_value_text: null, new_value_number: 12.5, new_value_date: null,
      status: null, change_reason: null, user_email: null, user_name: null,
    });
    expect(out.oldValue).toBe(10);
    expect(out.newValue).toBe(12.5);
    expect(out.user).toBeNull();
  });

  it('formatteert een datumwaarde naar yyyy-mm-dd', () => {
    const out = formatHistoryRow({
      source: 'custom', action: 'update', at: '2026-06-30T10:15:00.000Z',
      old_value_text: null, old_value_number: null, old_value_date: new Date('2026-07-01T00:00:00Z'),
      new_value_text: null, new_value_number: null, new_value_date: new Date('2026-07-15T00:00:00Z'),
      status: null, change_reason: null, user_email: null, user_name: null,
    });
    expect(out.oldValue).toBe('2026-07-01');
    expect(out.newValue).toBe('2026-07-15');
  });

  it('geeft een write-back-correctie met status en D365-bron door', () => {
    const out = formatHistoryRow({
      source: 'writeback', action: 'correct', at: '2026-06-30T10:15:00.000Z',
      old_value_text: 'oud', old_value_number: null, old_value_date: null,
      new_value_text: 'nieuw', new_value_number: null, new_value_date: null,
      status: 'applied', change_reason: null, user_email: 'b@c.nl', user_name: null,
    });
    expect(out.source).toBe('writeback');
    expect(out.status).toBe('applied');
    expect(out.oldValue).toBe('oud');
    expect(out.newValue).toBe('nieuw');
    expect(out.user).toEqual({ name: null, email: 'b@c.nl' });
  });

  it('behandelt een lege waarde (clear) als null', () => {
    const out = formatHistoryRow({
      source: 'custom', action: 'clear', at: '2026-06-30T10:15:00.000Z',
      old_value_text: 'iets', old_value_number: null, old_value_date: null,
      new_value_text: null, new_value_number: null, new_value_date: null,
      status: null, change_reason: null, user_email: null, user_name: null,
    });
    expect(out.action).toBe('clear');
    expect(out.oldValue).toBe('iets');
    expect(out.newValue).toBeNull();
  });
});
