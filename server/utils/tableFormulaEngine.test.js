'use strict';

const { compileFormula, evaluateCompiledFormula, extractFormulaReferences } = require('./tableFormulaEngine');

describe('tableFormulaEngine.compileFormula', () => {
  it('compileert een geldige ALS-formule en verzamelt refs', () => {
    const compiled = compileFormula("ALS((a)>(b);'Fout';(a)+(b))");
    expect(compiled).toHaveProperty('ast');
    expect([...compiled.references].sort()).toEqual(['a', 'b']);
  });

  it('geeft een syntaxfout bij ongeldige formule', () => {
    expect(() => compileFormula('ALS((a)>(b);1')).toThrow();
  });

  it('extraheert refs case-insensitive', () => {
    const refs = extractFormulaReferences("ALS((Budget)>(KOSTEN);'X';'Y')");
    expect(refs.sort()).toEqual(['budget', 'kosten']);
  });
});

describe('tableFormulaEngine.evaluateCompiledFormula', () => {
  it('rekent een ALS-formule correct uit', () => {
    const compiled = compileFormula("ALS((a)>(b);'Fout';(a)+(b))");
    const res = evaluateCompiledFormula(compiled, { a: 3, b: 5 }, { resultType: 'text' });
    expect(res).toEqual({ value: '8', error: null });
  });

  it('levert runtime-fout bij onbekende kolom', () => {
    const compiled = compileFormula('(bekend)+(onbekend)');
    const res = evaluateCompiledFormula(compiled, { bekend: 1 }, { resultType: 'number' });
    expect(res.value).toBeNull();
    expect(res.error).toContain('Onbekende kolomreferentie');
  });

  it('levert runtime-fout bij deling door nul', () => {
    const compiled = compileFormula('(a)/(b)');
    const res = evaluateCompiledFormula(compiled, { a: 12, b: 0 }, { resultType: 'number' });
    expect(res.value).toBeNull();
    expect(res.error).toContain('Deling door nul');
  });

  it('behandelt lege operand als 0', () => {
    const compiled = compileFormula('(a)+(b)');
    const res = evaluateCompiledFormula(compiled, { a: 7, b: null }, { resultType: 'number' });
    expect(res).toEqual({ value: 7, error: null });
  });

  it('ondersteunt datum plus getal', () => {
    const compiled = compileFormula('(start)+(dagen)');
    const res = evaluateCompiledFormula(
      compiled,
      { start: '2026-01-10T00:00:00.000Z', dagen: 2 },
      { resultType: 'date' }
    );
    expect(res.error).toBeNull();
    expect(res.value).toBe('2026-01-12T00:00:00.000Z');
  });

  it('ondersteunt datum min datum (dagen)', () => {
    const compiled = compileFormula('(eind)-(start)');
    const res = evaluateCompiledFormula(
      compiled,
      { start: '2026-01-10T00:00:00.000Z', eind: '2026-01-12T00:00:00.000Z' },
      { resultType: 'number' }
    );
    expect(res).toEqual({ value: 2, error: null });
  });

  it('cast naar boolean-resultaattype', () => {
    const compiled = compileFormula('(a)>(b)');
    const res = evaluateCompiledFormula(compiled, { a: 9, b: 3 }, { resultType: 'boolean' });
    expect(res).toEqual({ value: true, error: null });
  });
});
