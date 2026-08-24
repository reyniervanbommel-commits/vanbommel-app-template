import { describe, expect, it } from 'vitest';
import { withHistoryFlag } from './withHistoryFlag';

describe('withHistoryFlag', () => {
  it('zet de kolomvlag op true bij een ontbrekende map', () => {
    expect(withHistoryFlag(undefined, 11)).toEqual({ 11: true });
    expect(withHistoryFlag(null, '11')).toEqual({ 11: true });
  });

  it('behoudt bestaande andere kolommen', () => {
    const existing = { 11: true };
    expect(withHistoryFlag(existing, 12)).toEqual({ 11: true, 12: true });
    expect(existing).toEqual({ 11: true });
  });

  it('geeft dezelfde referentie terug als de vlag al true is', () => {
    const existing = { 11: true, 12: true };
    expect(withHistoryFlag(existing, 11)).toBe(existing);
    expect(withHistoryFlag(existing, '11')).toBe(existing);
  });

  it('normaliseert number- en string-ids naar dezelfde sleutel', () => {
    expect(withHistoryFlag({}, 21)).toEqual({ 21: true });
    expect(withHistoryFlag({}, '21')).toEqual({ 21: true });
  });
});
