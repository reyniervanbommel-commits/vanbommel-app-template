'use strict';

const { compileFormula, evaluateCompiledFormula, extractFormulaReferences } = require('./tableFormulaEngine');

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
      throw Object.assign(new Error(`Formula cannot reference itself (${ownKey})`), { status: 400 });
    }
    const target = byKey.get(key);
    if (!target) {
      throw Object.assign(new Error(`Unknown column reference in formula: (${ref})`), { status: 400 });
    }
    if (String(target.scope || '') !== 'master') {
      throw Object.assign(new Error(`Formula may only reference master columns: (${ref})`), { status: 400 });
    }
    if (String(target.formulaExpr || '').trim()) {
      throw Object.assign(new Error(`Formula cannot reference a formula column: (${ref})`), { status: 400 });
    }
  }
}

function sampleValueForColumn(column) {
  const type = String(column?.dataType || '').toLowerCase();
  if (type === 'number') return 10;
  if (type === 'boolean') return true;
  if (type === 'date') return '2026-07-01';
  return 'tekst';
}

function validateFormulaResultTypeCompatibility(expression, references, columns, resultType) {
  const cleanExpression = String(expression || '').trim();
  if (!cleanExpression) {
    throw Object.assign(new Error('Formula is required'), { status: 400 });
  }
  const compiled = compileFormula(cleanExpression);
  const byKey = new Map((Array.isArray(columns) ? columns : []).map((column) => [
    String(column?.key || '').toLowerCase(),
    column,
  ]));
  const sampleValues = {};
  for (const ref of Array.isArray(references) ? references : []) {
    const target = byKey.get(String(ref || '').toLowerCase());
    if (!target) continue;
    const sample = sampleValueForColumn(target);
    const targetKey = String(target.key || '').trim();
    if (targetKey) sampleValues[targetKey] = sample;
    sampleValues[String(ref || '').trim()] = sample;
    sampleValues[String(ref || '').trim().toLowerCase()] = sample;
  }
  const result = evaluateCompiledFormula(compiled, sampleValues, { resultType });
  if (result.error) {
    throw Object.assign(
      new Error(`Formula does not match result type '${resultType}': ${result.error}`),
      { status: 400 }
    );
  }
}

module.exports = {
  fallbackExtractFormulaReferences,
  findDependentFormulaColumn,
  normalizeFormulaExpression,
  validateFormulaReferences,
  validateFormulaResultTypeCompatibility,
};
