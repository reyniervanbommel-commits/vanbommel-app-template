'use strict';

const { isSentinelDate, planningDateValue } = require('./rccpPoRow');

describe('isSentinelDate', () => {
  it('is false voor leeg', () => {
    expect(isSentinelDate(null)).toBe(false);
    expect(isSentinelDate('')).toBe(false);
  });

  it('is true voor 1-1-1900', () => {
    expect(isSentinelDate('1900-01-01')).toBe(true);
    expect(isSentinelDate(new Date(Date.UTC(1900, 0, 1)))).toBe(true);
  });

  it('is false voor ongeldige strings', () => {
    expect(isSentinelDate('not-a-date')).toBe(false);
  });
});

describe('planningDateValue', () => {
  const requested = '2026-09-14'; // ISO week 38
  const confirmed = '2026-09-28'; // ISO week 40
  const line = { requestedDeliveryDate: requested, confirmedDeliveryDate: confirmed };

  it('in confirmed-modus gebruikt alleen confirmed', () => {
    expect(planningDateValue(line, {}, 'requestedDeliveryDate', 'confirmedDeliveryDate', 'confirmed'))
      .toBe(confirmed);
  });

  it('in confirmed-modus geeft null bij lege of 1900 confirmed', () => {
    expect(planningDateValue(
      { requestedDeliveryDate: requested },
      {},
      'requestedDeliveryDate',
      'confirmedDeliveryDate',
      'confirmed',
    )).toBeNull();
    expect(planningDateValue(
      { requestedDeliveryDate: requested, confirmedDeliveryDate: '1900-01-01' },
      {},
      'requestedDeliveryDate',
      'confirmedDeliveryDate',
      'confirmed',
    )).toBeNull();
  });

  it('in requested-modus gebruikt requested ook als confirmed bestaat', () => {
    expect(planningDateValue(line, {}, 'requestedDeliveryDate', 'confirmedDeliveryDate', 'requested'))
      .toBe(requested);
  });

  it('in requested-modus houdt 1-1-1900 zodat die week gemarkeerd kan worden', () => {
    expect(planningDateValue(
      { requestedDeliveryDate: '1900-01-01' },
      {},
      'requestedDeliveryDate',
      'confirmedDeliveryDate',
      'requested',
    )).toBe('1900-01-01');
  });

  it('default is requested (geen automatische fallback naar confirmed)', () => {
    expect(planningDateValue(line, {}, 'requestedDeliveryDate', 'confirmedDeliveryDate'))
      .toBe(requested);
  });
});
