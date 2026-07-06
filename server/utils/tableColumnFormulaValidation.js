'use strict';

const { compileFormula, extractFormulaReferences } = require('./tableFormulaEngine');

function fallbackExtractFormulaReferences(formulaExpr) {
  const text = String(formulaExpr || '');
  const matches = text.match(/\(([A-Za-z0-9_]+)\)/g) || [];
  return matches.map((m) => m.slice(1, -1).toLowerCase());
}

function findDependentFormulaColumn(formulaRows, targetColumnKey) {
  const targetKey = String(targetColumnKey || '').toLowerCase();
  if (!targetKey) return null;
  for (const row of Array.isArray(formulaRows) ? formulaRows : []) {
    const expression = String(row.formula_expr || '').trim();
    if (!expression) continue;
    let refs = [];
    try {
      refs = extractFormulaReferences(expression);
    } catch {
      refs = fallbackExtractFormulaReferences(expression);
    }
    if (refs.map((r) => String(r).toLowerCase()).includes(targetKey)) return row;
  }
  return null;
}

function normalizeFormulaExpression(formulaExpr) {
  const raw = formulaExpr === undefined || formulaExpr === null ? '' : String(formulaExpr).trim();
  if (!raw) return { expression: null, references: [] };
  const compiled = compileFormula(raw);
  return {
    expression: compiled.expression,
    references: [...compiled.references].map((ref) => String(ref).toLowerCase()),
  };
}

function validateFormulaReferences(references, columns, ownKey = '') {
  const byKey = new Map((Array.isArray(columns) ? columns : []).map((column) => [
    String(column?.key || '').toLowerCase(),
    column,
  ]));
  const ownKeyLower = String(ownKey || '').toLowerCase();
  for (const ref of Array.isArray(references) ? references : []) {
    const key = String(ref || '').toLowerCase();
    if (!key) continue;
    if (ownKeyLower && key === ownKeyLower) {
      throw Object.assign(new Error(`Formule mag niet naar zichzelf verwijzen (${ownKey})`), { status: 400 });
    }
    const target = byKey.get(key);
    if (!target) {
      throw Object.assign(new Error(`Onbekende kolomreferentie in formule: (${ref})`), { status: 400 });
    }
    if (String(target.scope || '') !== 'master') {
      throw Object.assign(new Error(`Formule mag alleen naar master-kolommen verwijzen: (${ref})`), { status: 400 });
    }
    if (String(target.formulaExpr || '').trim()) {
      throw Object.assign(new Error(`Formule mag niet verwijzen naar formulekolom: (${ref})`), { status: 400 });
    }
  }
}

module.exports = {
  fallbackExtractFormulaReferences,
  findDependentFormulaColumn,
  normalizeFormulaExpression,
  validateFormulaReferences,
};
