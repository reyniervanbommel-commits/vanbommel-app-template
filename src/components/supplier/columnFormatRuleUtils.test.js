import {
  evalFormatRules,
  normalizeColumnFormatRuleSet,
  normalizeColumnFormatRulesMap,
} from './columnFormatRuleUtils';

describe('columnFormatRuleUtils.normalizeColumnFormatRuleSet', () => {
  it('normaliseert een geldig rule-set object', () => {
    expect(normalizeColumnFormatRuleSet({
      target: 'row',
      rules: [{ op: '>', value: 10, color: '#E6F4FF' }],
    })).toEqual({
      target: 'row',
      rules: [{ op: '>', value: 10, color: '#e6f4ff' }],
    });
  });

  it('geeft null terug bij lege regels', () => {
    expect(normalizeColumnFormatRuleSet({ target: 'cell', rules: [] })).toBeNull();
  });
});

describe('columnFormatRuleUtils.normalizeColumnFormatRulesMap', () => {
  it('filtert op allowed keys', () => {
    const map = normalizeColumnFormatRulesMap({
      score: { target: 'cell', rules: [{ op: '>=', value: 1, color: '#E6F4FF' }] },
      bogus: { target: 'cell', rules: [{ op: '>=', value: 1, color: '#E6F4FF' }] },
    }, ['score']);
    expect(Object.keys(map)).toEqual(['score']);
  });
});

describe('columnFormatRuleUtils.evalFormatRules', () => {
  it('geeft de eerste matchende kleur', () => {
    const color = evalFormatRules(12, {
      target: 'cell',
      rules: [
        { op: '>', value: 10, color: '#E6F4FF' },
        { op: '>', value: 5, color: '#FFF4CE' },
      ],
    });
    expect(color).toBe('#e6f4ff');
  });

  it('ondersteunt valueRef vergelijking', () => {
    const color = evalFormatRules(20, {
      target: 'cell',
      rules: [{ op: '>', valueRef: 'budget', color: '#E7F4EA' }],
    }, { budget: 15 });
    expect(color).toBe('#e7f4ea');
  });

  it('geeft null bij ontbrekende valueRef kolom', () => {
    const color = evalFormatRules(20, {
      target: 'cell',
      rules: [{ op: '>', valueRef: 'budget', color: '#E7F4EA' }],
    }, {});
    expect(color).toBeNull();
  });

  it('geeft null bij errored/lege formule-uitkomst', () => {
    expect(evalFormatRules(null, {
      target: 'cell',
      rules: [{ op: '>', value: 10, color: '#E6F4FF' }],
    })).toBeNull();
  });

  it('ondersteunt lege string vergelijking', () => {
    const color = evalFormatRules('', {
      target: 'cell',
      rules: [{ op: '=', value: '', color: '#FFF4CE' }],
    });
    expect(color).toBe('#fff4ce');
  });
});
