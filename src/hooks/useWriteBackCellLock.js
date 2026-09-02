import { useMemo } from 'react';
import { useBulkWriteBackJobOptional } from '../context/BulkWriteBackJobContext';
import { cellLockStatus } from './bulkWriteBackJobState';
import { rowSelectionKey } from './usePurchaseOrderRowSelection';

/**
 * Lock-status van één D365 write-back-cel t.o.v. de lopende achtergrondjob.
 * Input: kolom + rij-sleutels. Output: { status, errorMessage } (status kan null zijn).
 */
export function useWriteBackCellLock(columnKey, dataAreaId, orderNumber) {
  const ctx = useBulkWriteBackJobOptional();
  const rowKey = rowSelectionKey(dataAreaId, orderNumber);
  return useMemo(() => {
    const job = ctx?.job;
    const status = cellLockStatus(job, rowKey, columnKey);
    const errorMessage = (job?.failedRows || []).find((row) => row.key === rowKey)?.errorMessage || '';
    return { status, errorMessage };
  }, [columnKey, ctx?.job, rowKey]);
}
