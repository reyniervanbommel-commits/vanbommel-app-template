/**
 * Kolommen die in RCCP als hoeveelheid gekozen mogen worden.
 * @param {{ key?: string, scope?: string, rccpMeasure?: boolean, source?: string, formulaExpr?: string, isActive?: boolean }} col
 * @returns {boolean}
 */
export function isRccpQuantityColumn(col) {
  if (!col?.key) return false;
  if (col.isActive === false) return false;
  if (col.rccpMeasure) return true;
  if (col.scope === 'detail') return false;
  const source = String(col.source || '').toLowerCase();
  if (source === 'custom') return true;
  return Boolean(String(col.formulaExpr || '').trim());
}
