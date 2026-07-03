'use strict';

const { resolveWriteback, slugify } = require('./TableColumnsService');

describe('TableColumnsService.resolveWriteback', () => {
  it('writable=false => mechanism altijd null', () => {
    expect(resolveWriteback({ writable: false, mechanism: 'patch' })).toEqual({ writable: 0, mechanism: null });
    expect(resolveWriteback({ writable: 0 })).toEqual({ writable: 0, mechanism: null });
  });

  it('writable=true zonder mechanisme => default patch', () => {
    expect(resolveWriteback({ writable: true })).toEqual({ writable: 1, mechanism: 'patch' });
    expect(resolveWriteback({ writable: '1', mechanism: '' })).toEqual({ writable: 1, mechanism: 'patch' });
  });

  it('accepteert geldige mechanismen', () => {
    expect(resolveWriteback({ writable: true, mechanism: 'action' })).toEqual({ writable: 1, mechanism: 'action' });
    expect(resolveWriteback({ writable: true, mechanism: 'sql' })).toEqual({ writable: 1, mechanism: 'sql' });
  });

  it('weigert een onbekend mechanisme', () => {
    expect(() => resolveWriteback({ writable: true, mechanism: 'webhook' })).toThrow();
  });
});

describe('TableColumnsService.slugify', () => {
  it('normaliseert label naar een kolomsleutel', () => {
    expect(slugify('Leverancier Naam')).toBe('leverancier_naam');
    expect(slugify('  Prijs (â‚¬) ')).toContain('prijs');
  });

  it('valt terug op "kolom" bij lege input', () => {
    expect(slugify('')).toBe('kolom');
    expect(slugify('!!!')).toBe('kolom');
  });
});
