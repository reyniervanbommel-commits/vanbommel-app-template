'use strict';

const {
  resolveWriteback,
  slugify,
  findDependentFormulaColumn,
  normalizeFormulaExpression,
  validateFormulaReferences,
  validateFormulaResultTypeCompatibility,
} = require('./TableColumnsService');

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

describe('TableColumnsService.findDependentFormulaColumn', () => {
  it('vindt een formule die naar de doelkolom verwijst', () => {
    const dependent = findDependentFormulaColumn(
      [
        { label: 'Totale score', formula_expr: "ALS((a)>(b);'Fout';(a)+(b))" },
        { label: 'Overig', formula_expr: '(x)+(y)' },
      ],
      'b'
    );
    expect(dependent?.label).toBe('Totale score');
  });

  it('geeft null als geen formule de kolom gebruikt', () => {
    const dependent = findDependentFormulaColumn(
      [{ label: 'Overig', formula_expr: '(x)+(y)' }],
      'niet_bestaand'
    );
    expect(dependent).toBeNull();
  });
});

describe('TableColumnsService formula helpers', () => {
  it('normaliseert formule en refs', () => {
    const normalized = normalizeFormulaExpression("= ALS((a)>(b);'Fout';(a)+(b)) ");
    expect(normalized.expression).toBe("ALS((a)>(b);'Fout';(a)+(b))");
    expect(normalized.references.sort()).toEqual(['a', 'b']);
  });

  it('laat lege formule door als null', () => {
    expect(normalizeFormulaExpression('  ')).toEqual({ expression: null, references: [] });
  });

  it('weigert onbekende of formule-referenties', () => {
    const columns = [
      { key: 'budget', scope: 'master', formulaExpr: null },
      { key: 'delta', scope: 'master', formulaExpr: '(a)+(b)' },
    ];
    expect(() => validateFormulaReferences(['onbekend'], columns, 'nieuw')).toThrow(/Onbekende kolomreferentie/i);
    expect(() => validateFormulaReferences(['delta'], columns, 'nieuw')).toThrow(/formulekolom/i);
  });

  it('weigert formule met onjuist resultaattype', () => {
    const columns = [
      { key: 'a', dataType: 'number' },
      { key: 'b', dataType: 'number' },
    ];
    expect(() => validateFormulaResultTypeCompatibility(
      "ALS((a)>(b);'kleiner';'groter')",
      ['a', 'b'],
      columns,
      'number'
    )).toThrow(/resultaattype/i);
  });

  it('accepteert formule als resultaattype klopt', () => {
    const columns = [
      { key: 'a', dataType: 'number' },
      { key: 'b', dataType: 'number' },
    ];
    expect(() => validateFormulaResultTypeCompatibility(
      "ALS((a)>(b);'kleiner';'groter')",
      ['a', 'b'],
      columns,
      'text'
    )).not.toThrow();
  });
});
