'use strict';

const { findScopedColumn, parseRccpColumnRef, toScopedColumnKey } = require('./rccpColumnRef');

describe('parseRccpColumnRef', () => {
  it('leest master- en detail-prefix', () => {
    expect(parseRccpColumnRef('master:vendorAccount')).toEqual({ scope: 'master', key: 'vendorAccount' });
    expect(parseRccpColumnRef('detail:requestedDeliveryDate'))
      .toEqual({ scope: 'detail', key: 'requestedDeliveryDate' });
  });

  it('houdt een ongeprefixte identifier zonder scope', () => {
    expect(parseRccpColumnRef('requestedDeliveryDate'))
      .toEqual({ scope: null, key: 'requestedDeliveryDate' });
  });
});

describe('findScopedColumn', () => {
  const columns = [
    { key: 'requestedDeliveryDate', scope: 'master' },
    { key: 'requestedDeliveryDate', scope: 'detail' },
  ];

  it('kiest de regel als er geen prefix is', () => {
    expect(findScopedColumn(columns, 'requestedDeliveryDate').scope).toBe('detail');
  });

  it('eert een header-prefix', () => {
    expect(findScopedColumn(columns, 'master:requestedDeliveryDate').scope).toBe('master');
  });
});

describe('toScopedColumnKey', () => {
  const columns = [
    { key: 'requestedDeliveryDate', scope: 'master' },
    { key: 'requestedDeliveryDate', scope: 'detail' },
    { key: 'vendorAccount', scope: 'master' },
  ];

  it('schrijft een ongeprefixte key terug met de gekozen scope', () => {
    expect(toScopedColumnKey('requestedDeliveryDate', columns)).toBe('detail:requestedDeliveryDate');
    expect(toScopedColumnKey('vendorAccount', columns)).toBe('master:vendorAccount');
  });
});
