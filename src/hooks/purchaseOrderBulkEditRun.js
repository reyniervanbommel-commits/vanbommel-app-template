import { rowSelectionKey } from './usePurchaseOrderRowSelection';

export function valuesEqual(left, right) {
  if (Object.is(left, right)) return true;
  const normalizedLeft = left === undefined ? null : left;
  const normalizedRight = right === undefined ? null : right;
  if (Object.is(normalizedLeft, normalizedRight)) return true;
  return String(normalizedLeft ?? '') === String(normalizedRight ?? '');
}

/**
 * Sequentiële D365-correcties: gaat door na een fout en verzamelt failedRows.
 * I/O via geïnjecteerde runSingleUpdate; onSettled vuurt na elke kandidaat.
 */
export async function runCorrectRows({
  candidates, payload, runSingleUpdate, onSettled, onRowStart,
}) {
  let updated = 0;
  let skipped = 0;
  const failedRows = [];
  for (const candidate of candidates) {
    const key = rowSelectionKey(candidate.dataAreaId, candidate.orderNumber);
    if (valuesEqual(candidate.currentValue, payload.value)) {
      skipped += 1;
      onSettled?.({ key, outcome: 'skipped' });
      continue;
    }
    onRowStart?.(key);
    try {
      await runSingleUpdate('correct', {
        columnId: payload.columnId,
        columnKey: payload.columnKey,
        dataAreaId: candidate.dataAreaId,
        orderNumber: candidate.orderNumber,
        lineNumber: null,
        value: payload.value,
        basedOnValue: candidate.currentValue,
      });
      updated += 1;
      onSettled?.({ key, outcome: 'updated' });
      continue;
    } catch (err) {
      failedRows.push({
        key,
        dataAreaId: candidate.dataAreaId,
        orderNumber: candidate.orderNumber,
        columnId: payload.columnId,
        columnKey: payload.columnKey,
        value: payload.value,
        basedOnValue: candidate.currentValue,
        errorMessage: err.message || 'Write-back failed',
      });
      onSettled?.({ key, outcome: 'failed', failedRow: failedRows[failedRows.length - 1] });
    }
  }
  return { updated, skipped, failedRows };
}
