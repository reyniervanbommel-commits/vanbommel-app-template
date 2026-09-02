import { rowSelectionKey } from './usePurchaseOrderRowSelection';

export const JOB_RUNNING = 'running';
export const JOB_NEEDS_ATTENTION = 'needsAttention';
export const LARGE_BULK_SELECTION = 25;

export function buildCorrectSummaryMessage({ updated, skipped, failedCount }) {
  return `Bulk edit finished. Updated: ${updated}. Skipped: ${skipped}. Failed: ${failedCount}.`;
}

export function orderKeysFromCandidates(candidates) {
  return (Array.isArray(candidates) ? candidates : []).map((candidate) => (
    rowSelectionKey(candidate.dataAreaId, candidate.orderNumber)
  ));
}

/**
 * Lock voor één write-back-cel: queued / writing / failed, of null.
 * Alleen de kolom van de lopende job, alleen geselecteerde rijen.
 */
export function cellLockStatus(job, rowKey, columnKey) {
  if (!job || !rowKey || !columnKey) return null;
  if (job.columnKey !== columnKey) return null;
  const rowKeys = job.rowKeys || [];
  if (!rowKeys.includes(rowKey)) return null;
  if ((job.failedRows || []).some((row) => row.key === rowKey)) return 'failed';
  if (job.status === JOB_NEEDS_ATTENTION) return null;
  if ((job.doneKeys || []).includes(rowKey)) return null;
  if (job.currentKey === rowKey) return 'writing';
  if (job.status === JOB_RUNNING) return 'queued';
  return null;
}

export function isJobRunning(job) {
  return job?.status === JOB_RUNNING;
}

export function jobBadgeLabel(job) {
  if (!job) return '';
  if (job.status === JOB_RUNNING) {
    return `Write-back ${job.processed}/${job.total}`;
  }
  const failedCount = job.failedRows?.length || 0;
  if (job.status === JOB_NEEDS_ATTENTION && failedCount) {
    return failedCount === 1 ? 'Write-back: 1 failed' : `Write-back: ${failedCount} failed`;
  }
  return '';
}
