import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getSecretExpiryStatus } = require('./secretExpiry');

const NOW = new Date('2026-07-19T12:00:00Z');

describe('getSecretExpiryStatus', () => {
  it('geeft status unknown bij een lege waarde', () => {
    const result = getSecretExpiryStatus('', NOW);
    expect(result.status).toBe('unknown');
    expect(result.expiresAt).toBeNull();
    expect(result.daysRemaining).toBeNull();
  });

  it('geeft status unknown bij een onleesbare datum (geen vals alarm bij een typefout)', () => {
    expect(getSecretExpiryStatus('niet-een-datum', NOW).status).toBe('unknown');
  });

  it('geeft status ok als de vervaldatum ver weg is', () => {
    const result = getSecretExpiryStatus('2028-07-19', NOW);
    expect(result.status).toBe('ok');
    expect(result.daysRemaining).toBeGreaterThan(30);
  });

  it('geeft status warning precies op de drempel van 30 dagen', () => {
    const result = getSecretExpiryStatus('2026-08-18T12:00:00Z', NOW);
    expect(result.daysRemaining).toBe(30);
    expect(result.status).toBe('warning');
  });

  it('geeft status ok net buiten de drempel (31 dagen)', () => {
    const result = getSecretExpiryStatus('2026-08-19T12:00:00Z', NOW);
    expect(result.daysRemaining).toBe(31);
    expect(result.status).toBe('ok');
  });

  it('geeft status expired op en na de vervaldatum', () => {
    expect(getSecretExpiryStatus('2026-07-19T12:00:00Z', NOW).status).toBe('expired');
    expect(getSecretExpiryStatus('2026-07-01', NOW).status).toBe('expired');
  });

  it('rondt resterende dagen naar boven af', () => {
    // Ruim 7 uur voor het verlopen telt als 1 dag, niet als 0.
    const result = getSecretExpiryStatus('2026-07-19T19:00:00Z', NOW);
    expect(result.daysRemaining).toBe(1);
    expect(result.status).toBe('warning');
  });
});
