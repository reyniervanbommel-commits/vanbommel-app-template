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
    expect(res.error).toContain('Unknown column reference');
  });

  it('levert runtime-fout bij deling door nul', () => {
    const compiled = compileFormula('(a)/(b)');
    const res = evaluateCompiledFormula(compiled, { a: 12, b: 0 }, { resultType: 'number' });
    expect(res.value).toBeNull();
    expect(res.error).toContain('Division by zero');
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

  it('ondersteunt IF als Engelse alias van ALS', () => {
    const compiled = compileFormula("IF((a)>(b);'groter';'kleiner')");
    const res = evaluateCompiledFormula(compiled, { a: 9, b: 3 }, { resultType: 'text' });
    expect(res).toEqual({ value: 'groter', error: null });
  });
});

describe('tableFormulaEngine — TODAY()', () => {
  it('gebruikt de meegegeven "today" i.p.v. de systeemklok', () => {
    const compiled = compileFormula('(TODAY())-(leverdatum)');
    const res = evaluateCompiledFormula(
      compiled,
      { leverdatum: '2026-07-10T00:00:00.000Z' },
      { resultType: 'number', today: new Date('2026-07-22T00:00:00.000Z') }
    );
    expect(res).toEqual({ value: 12, error: null });
  });

  it('valt terug op de systeemklok wanneer "today" niet is meegegeven', () => {
    const compiled = compileFormula('TODAY()');
    const res = evaluateCompiledFormula(compiled, {}, { resultType: 'date' });
    expect(res.error).toBeNull();
    expect(res.value).toMatch(/T00:00:00\.000Z$/);
  });

  it('dezelfde "today" geeft dezelfde uitkomst voor meerdere rijen (consistentie binnen één read)', () => {
    const compiled = compileFormula('(TODAY())-(leverdatum)');
    const today = new Date('2026-07-22T00:00:00.000Z');
    const rowA = evaluateCompiledFormula(compiled, { leverdatum: '2026-07-01T00:00:00.000Z' }, { resultType: 'number', today });
    const rowB = evaluateCompiledFormula(compiled, { leverdatum: '2026-07-15T00:00:00.000Z' }, { resultType: 'number', today });
    expect(rowA.value).toBe(21);
    expect(rowB.value).toBe(7);
  });
});

describe('tableFormulaEngine — AFRONDEN/ROUND, ABS, MAX, MIN', () => {
  const today = new Date('2026-07-22T00:00:00.000Z');

  it('zet dagen om naar hele weken met AFRONDEN', () => {
    const compiled = compileFormula('AFRONDEN(((TODAY())-(leverdatum))/7;0)');
    const res = evaluateCompiledFormula(
      compiled,
      { leverdatum: '2026-07-01T00:00:00.000Z' },
      { resultType: 'number', today }
    );
    // 21 dagen / 7 = 3 weken exact
    expect(res).toEqual({ value: 3, error: null });
  });

  it('AFRONDEN met decimalen, ROUND is een gelijkwaardig alias', () => {
    const compiledAfronden = compileFormula('AFRONDEN((getal);2)');
    const compiledRound = compileFormula('ROUND((getal);2)');
    const values = { getal: 3.14159 };
    expect(evaluateCompiledFormula(compiledAfronden, values, { resultType: 'number' }).value).toBe(3.14);
    expect(evaluateCompiledFormula(compiledRound, values, { resultType: 'number' }).value).toBe(3.14);
  });

  it('ABS levert een absolute waarde, ook voor te vroege leveringen', () => {
    const compiled = compileFormula('ABS((TODAY())-(leverdatum))');
    const res = evaluateCompiledFormula(
      compiled,
      { leverdatum: '2026-08-01T00:00:00.000Z' },
      { resultType: 'number', today }
    );
    expect(res).toEqual({ value: 10, error: null });
  });

  it('MAX clampt negatieve achterstand naar 0 (nog niet te laat)', () => {
    const compiled = compileFormula('MAX(0;(TODAY())-(leverdatum))');
    const res = evaluateCompiledFormula(
      compiled,
      { leverdatum: '2026-08-01T00:00:00.000Z' },
      { resultType: 'number', today }
    );
    expect(res).toEqual({ value: 0, error: null });
  });

  it('MIN geeft de kleinste van meerdere waarden', () => {
    const compiled = compileFormula('MIN((a);(b);(c))');
    const res = evaluateCompiledFormula(compiled, { a: 8, b: 3, c: 5 }, { resultType: 'number' });
    expect(res).toEqual({ value: 3, error: null });
  });

  it('geeft een duidelijke fout bij een onbekende functienaam', () => {
    const compiled = compileFormula('ONBEKEND((a))');
    const res = evaluateCompiledFormula(compiled, { a: 1 }, { resultType: 'number' });
    expect(res.value).toBeNull();
    expect(res.error).toContain("Unknown function 'ONBEKEND'");
  });

  it('geeft een duidelijke fout bij een verkeerd aantal argumenten', () => {
    const compiled = compileFormula('ABS((a);(b))');
    const res = evaluateCompiledFormula(compiled, { a: 1, b: 2 }, { resultType: 'number' });
    expect(res.value).toBeNull();
    expect(res.error).toContain('ABS expects 1 argument');
  });
});
