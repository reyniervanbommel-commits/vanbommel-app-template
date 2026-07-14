import { useCallback, useState } from 'react';
import { apiRequest } from '../utils/api';
import { getFormulaValidationTip } from '../components/supplier/purchaseOrderFormulaValidationTips';

const IDLE_VALIDATION = { status: 'idle', message: '', tip: '', normalizedExpression: '' };

export function usePurchaseOrderFormulaValidation() {
  const [formulaValidation, setFormulaValidation] = useState(IDLE_VALIDATION);

  const resetFormulaValidation = useCallback(() => {
    setFormulaValidation(IDLE_VALIDATION);
  }, []);

  const validateFormula = useCallback(async ({ formulaExpr, ownColumnKey = '', dataType = 'number' }) => {
    const cleanFormula = String(formulaExpr || '').trim();
    if (!cleanFormula) {
      const message = 'Formula is required';
      setFormulaValidation({
        status: 'invalid',
        message,
        tip: getFormulaValidationTip(message),
        normalizedExpression: '',
      });
      return { valid: false };
    }

    setFormulaValidation({ status: 'checking', message: '', tip: '', normalizedExpression: '' });
    try {
      const result = await apiRequest('/data/purchase-orders/columns/validate-formula', {
        method: 'POST',
        body: {
          formulaExpr: cleanFormula,
          ownColumnKey: String(ownColumnKey || ''),
          dataType: String(dataType || 'number'),
        },
      });
      const normalizedExpression = String(result?.normalizedExpression || cleanFormula);
      setFormulaValidation({
        status: 'valid',
        message: 'Formula is valid.',
        tip: '',
        normalizedExpression,
      });
      return { valid: true, normalizedExpression };
    } catch (err) {
      const message = err?.message || 'Formula is invalid';
      setFormulaValidation({
        status: 'invalid',
        message,
        tip: getFormulaValidationTip(message),
        normalizedExpression: '',
      });
      return { valid: false };
    }
  }, []);

  return {
    formulaValidation,
    validateFormula,
    resetFormulaValidation,
  };
}
