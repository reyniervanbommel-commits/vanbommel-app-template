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

  it('kiest confirmed wanneer die een echte week heeft', () => {
    expect(planningDateValue(
      { requestedDeliveryDate: requested, confirmedDeliveryDate: confirmed },
      {},
      'requestedDeliveryDate',
      'confirmedDeliveryDate',
    )).toBe(confirmed);
  });

  it('valt terug op requested bij lege confirmed', () => {
    expect(planningDateValue(
      { requestedDeliveryDate: requested },
      {},
      'requestedDeliveryDate',
      'confirmedDeliveryDate',
    )).toBe(requested);
  });

  it('valt terug op requested bij 1-1-1900', () => {
    expect(planningDateValue(
      { requestedDeliveryDate: requested, confirmedDeliveryDate: '1900-01-01' },
      {},
      'requestedDeliveryDate',
      'confirmedDeliveryDate',
    )).toBe(requested);
  });

  it('valt terug op requested bij onparseerbare confirmed', () => {
    expect(planningDateValue(
      { requestedDeliveryDate: requested, confirmedDeliveryDate: 'not-a-date' },
      {},
      'requestedDeliveryDate',
      'confirmedDeliveryDate',
    )).toBe(requested);
  });
});
