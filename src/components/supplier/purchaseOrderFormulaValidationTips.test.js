import { getFormulaValidationTip } from './purchaseOrderFormulaValidationTips';

describe('purchaseOrderFormulaValidationTips', () => {
  it('geeft haakjes-tip bij parsefout', () => {
    expect(getFormulaValidationTip('Expected EOF, got SEMI')).toContain('parentheses');
  });

  it('geeft kolom-picker tip bij onbekende referentie', () => {
    expect(getFormulaValidationTip('Unknown column reference in formula: (foo)')).toContain('column picker');
  });

  it('geeft lege string bij lege foutmelding', () => {
    expect(getFormulaValidationTip('')).toBe('');
  });

  it('geeft resultaattype-tip bij typefout', () => {
    expect(getFormulaValidationTip("Formula does not match result type 'number'")).toContain('result type');
  });
});
