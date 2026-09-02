import { useCallback, useMemo } from 'react';
import { apiRequest } from '../utils/api';

/**
 * Staff-only fan-out: één POST schrijft een D365-line-waarde terug op alle regels van één PO.
 * @param {{ patchLinkedLineValues: Function, applyLineValuesBatch?: Function }} params
 * @returns {{ onCorrectAllLines: Function }}
 */
export function usePurchaseOrderCorrectAllLines({
  patchLinkedLineValues,
  applyLineValuesBatch,
}) {
  const onCorrectAllLines = useCallback(async ({
    lineColumnId, lineColumnKey, headerColumnKey, dataAreaId, orderNumber, value,
  }) => {
    const response = await apiRequest('/data/purchase-orders/correct-all-details', {
      method: 'POST',
      body: { columnId: lineColumnId, partitionKey: dataAreaId, recordKey: orderNumber, value },
    });
    const remaining = Array.isArray(response.remainingValues) ? response.remainingValues : [];
    patchLinkedLineValues(dataAreaId, orderNumber, headerColumnKey, remaining);
    const updated = new Set(response.updatedDetailKeys || []);
    applyLineValuesBatch?.(dataAreaId, orderNumber, (line) => (
      updated.has(line.lineNumber)
        ? { ...line, values: { ...line.values, [lineColumnKey]: value } }
        : line
    ));
    if (response.failed > 0) {
      const err = new Error(`Write-back failed on ${response.failed} of ${response.attempted} lines.`);
      err.remainingDisplayValue = remaining[0] ?? '';
      throw err;
    }
    return response;
  }, [applyLineValuesBatch, patchLinkedLineValues]);

  return useMemo(() => ({ onCorrectAllLines }), [onCorrectAllLines]);
}
