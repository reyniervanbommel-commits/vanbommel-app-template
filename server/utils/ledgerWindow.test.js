'use strict';

const { LEDGER_WINDOW_MS, resolveLedgerSinceMs, usesViewedBaseline } = require('./ledgerWindow');

describe('resolveLedgerSinceMs', () => {
  const now = Date.parse('2026-08-22T12:00:00.000Z');

  it('gebruikt last_viewed_at als baseline wanneer die bestaat, ook als die ouder is dan last_full_sync_at', () => {
    const viewed = '2026-08-20T12:00:00.000Z';
    const synced = '2026-08-21T12:00:00.000Z';
    expect(resolveLedgerSinceMs({ lastViewedAt: viewed, lastFullSyncAt: synced, now })).toBe(Date.parse(viewed));
  });

  it('valt terug op last_full_sync_at als last_viewed_at ontbreekt', () => {
    const synced = '2026-08-20T12:00:00.000Z';
    expect(resolveLedgerSinceMs({ lastViewedAt: null, lastFullSyncAt: synced, now })).toBe(Date.parse(synced));
  });

  it('caped het venster op 14 dagen wanneer de baseline ouder is', () => {
    const viewed = '2026-01-01T00:00:00.000Z';
    expect(resolveLedgerSinceMs({ lastViewedAt: viewed, lastFullSyncAt: null, now })).toBe(now - LEDGER_WINDOW_MS);
  });

  it('geeft null als er geen baseline is', () => {
    expect(resolveLedgerSinceMs({ lastViewedAt: null, lastFullSyncAt: null, now })).toBeNull();
  });

  it('usesViewedBaseline is true zodra last_viewed_at bestaat', () => {
    expect(usesViewedBaseline('2026-08-01T00:00:00.000Z')).toBe(true);
    expect(usesViewedBaseline(null)).toBe(false);
  });
});
