import { describe, expect, it } from 'vitest';
import {
  LARGE_BULK_SELECTION,
  JOB_NEEDS_ATTENTION,
  JOB_RUNNING,
  JOB_SUCCESS,
  buildCorrectSummaryMessage,
  cellLockStatus,
  jobBadgeLabel,
  orderKeysFromCandidates,
} from './bulkWriteBackJobState';

const job = {
  status: JOB_RUNNING,
  columnKey: 'status',
  rowKeys: ['USMF|PO1', 'USMF|PO2', 'USMF|PO3'],
  currentKey: 'USMF|PO2',
  doneKeys: ['USMF|PO1'],
  failedRows: [],
  processed: 1,
  total: 3,
};

describe('cellLockStatus', () => {
  it('lockt alleen de job-kolom op geselecteerde rijen', () => {
    expect(cellLockStatus(job, 'USMF|PO3', 'status')).toBe('queued');
    expect(cellLockStatus(job, 'USMF|PO2', 'status')).toBe('writing');
    expect(cellLockStatus(job, 'USMF|PO1', 'status')).toBe(null);
    expect(cellLockStatus(job, 'USMF|PO3', 'other')).toBe(null);
    expect(cellLockStatus(job, 'USMF|PO99', 'status')).toBe(null);
  });

  it('houdt mislukte rijen gelockt na afronden', () => {
    const done = {
      ...job,
      status: JOB_NEEDS_ATTENTION,
      currentKey: null,
      failedRows: [{ key: 'USMF|PO2' }],
    };
    expect(cellLockStatus(done, 'USMF|PO2', 'status')).toBe('failed');
    expect(cellLockStatus(done, 'USMF|PO3', 'status')).toBe(null);
  });
});

describe('jobBadgeLabel', () => {
  it('toont voortgang tijdens de run', () => {
    expect(jobBadgeLabel(job)).toBe('Write-back 1/3');
  });

  it('toont failed-teller als aandacht nodig is', () => {
    expect(jobBadgeLabel({
      status: JOB_NEEDS_ATTENTION,
      failedRows: [{ key: 'a' }, { key: 'b' }],
    })).toBe('Write-back: 2 failed');
  });

  it('toont gelukt in dezelfde badge-slot', () => {
    expect(jobBadgeLabel({ status: JOB_SUCCESS })).toBe('Write-back complete');
  });
});

describe('helpers', () => {
  it('bouwt order-keys en summary-tekst', () => {
    expect(orderKeysFromCandidates([
      { dataAreaId: 'USMF', orderNumber: 'PO1' },
    ])).toEqual(['USMF|PO1']);
    expect(buildCorrectSummaryMessage({ updated: 2, skipped: 0, failedCount: 1 }))
      .toBe('Bulk edit finished. Updated: 2. Skipped: 0. Failed: 1.');
    expect(LARGE_BULK_SELECTION).toBe(25);
  });
});
