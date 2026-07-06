import { getFormulaValidationTip } from './purchaseOrderFormulaValidationTips';

describe('purchaseOrderFormulaValidationTips', () => {
  it('geeft haakjes-tip bij parsefout', () => {
    expect(getFormulaValidationTip('Verwacht EOF, kreeg SEMI')).toContain('haakjes');
  });

  it('geeft kolom-picker tip bij onbekende referentie', () => {
    expect(getFormulaValidationTip('Onbekende kolomreferentie in formule: (foo)')).toContain('kolom-picker');
  });

  it('geeft lege string bij lege foutmelding', () => {
    expect(getFormulaValidationTip('')).toBe('');
  });
});
