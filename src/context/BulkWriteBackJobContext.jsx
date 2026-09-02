import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAppToast } from '../hooks/useAppToast';
import { runCorrectRows } from '../hooks/purchaseOrderBulkEditRun';
import { usePurchaseOrderBulkEditRetry } from '../hooks/usePurchaseOrderBulkEditRetry';
import {
  JOB_NEEDS_ATTENTION,
  JOB_RUNNING,
  buildCorrectSummaryMessage,
  isJobRunning,
  orderKeysFromCandidates,
} from '../hooks/bulkWriteBackJobState';

const BulkWriteBackJobContext = createContext(null);

export function useBulkWriteBackJobOptional() {
  return useContext(BulkWriteBackJobContext);
}

export function useBulkWriteBackJob() {
  const ctx = useContext(BulkWriteBackJobContext);
  if (!ctx) throw new Error('useBulkWriteBackJob must be used within BulkWriteBackJobProvider');
  return ctx;
}

function applyJobUpdate(setJob, jobRef, updater) {
  setJob((prev) => {
    const next = updater(prev);
    jobRef.current = next;
    return next;
  });
}

/**
 * Houdt max. één D365 bulk-write-back-job in de app-shell (overleeft page-unmount).
 * Input: children. Output: startCorrectJob, job-state, retry, panel-acties.
 */
export function BulkWriteBackJobProvider({ children }) {
  const { notifyError, notifySuccess } = useAppToast();
  const [job, setJob] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const jobRef = useRef(null);
  const runSingleUpdateRef = useRef(null);
  const generationRef = useRef(0);

  const startCorrectJob = useCallback(({ payload, rows, columnLabel, runSingleUpdate }) => {
    if (isJobRunning(jobRef.current)) {
      notifyError('A write-back is already running. Wait until it finishes.');
      return false;
    }
    runSingleUpdateRef.current = runSingleUpdate;
    const candidates = (Array.isArray(rows) ? rows : []).map((row) => ({
      dataAreaId: row.dataAreaId,
      orderNumber: row.orderNumber,
      currentValue: row?.values?.[payload.columnKey],
    }));
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const nextJob = {
      status: JOB_RUNNING,
      columnKey: payload.columnKey,
      columnLabel: columnLabel || payload.columnKey,
      payload,
      rowKeys: orderKeysFromCandidates(candidates),
      currentKey: null,
      processed: 0,
      total: candidates.length,
      updated: 0,
      skipped: 0,
      failedRows: [],
      doneKeys: [],
      summaryMessage: '',
    };
    jobRef.current = nextJob;
    setJob(nextJob);

    void (async () => {
      const result = await runCorrectRows({
        candidates,
        payload,
        runSingleUpdate: (...args) => runSingleUpdateRef.current?.(...args),
        onRowStart: (key) => {
          if (generationRef.current !== generation) return;
          applyJobUpdate(setJob, jobRef, (prev) => (prev ? { ...prev, currentKey: key } : prev));
        },
        onSettled: ({ key, outcome, failedRow }) => {
          if (generationRef.current !== generation) return;
          applyJobUpdate(setJob, jobRef, (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              currentKey: null,
              processed: prev.processed + 1,
              updated: prev.updated + (outcome === 'updated' ? 1 : 0),
              skipped: prev.skipped + (outcome === 'skipped' ? 1 : 0),
              doneKeys: outcome === 'failed' ? prev.doneKeys : [...prev.doneKeys, key],
              failedRows: failedRow ? [...prev.failedRows, failedRow] : prev.failedRows,
            };
          });
        },
      });
      if (generationRef.current !== generation) return;
      const { updated, skipped, failedRows } = result;
      const summaryMessage = buildCorrectSummaryMessage({
        updated,
        skipped,
        failedCount: failedRows.length,
      });
      if (failedRows.length === 0) {
        notifySuccess(summaryMessage);
        jobRef.current = null;
        setJob(null);
        setPanelOpen(false);
        return;
      }
      applyJobUpdate(setJob, jobRef, (prev) => (prev ? {
        ...prev,
        status: JOB_NEEDS_ATTENTION,
        currentKey: null,
        failedRows,
        updated,
        skipped,
        summaryMessage,
      } : prev));
    })();
    return true;
  }, [notifyError, notifySuccess]);

  const handleFailedRowsChange = useCallback((updateFailedRows) => {
    const prev = jobRef.current;
    if (!prev) return;
    const failedRows = updateFailedRows(prev.failedRows || []);
    if (!failedRows.length) {
      const summaryMessage = buildCorrectSummaryMessage({
        updated: prev.updated,
        skipped: prev.skipped,
        failedCount: 0,
      });
      jobRef.current = null;
      setJob(null);
      notifySuccess(summaryMessage);
      return;
    }
    applyJobUpdate(setJob, jobRef, (current) => {
      if (!current) return current;
      return {
        ...current,
        failedRows,
        summaryMessage: buildCorrectSummaryMessage({
          updated: current.updated,
          skipped: current.skipped,
          failedCount: failedRows.length,
        }),
      };
    });
  }, [notifySuccess]);

  const runSingleUpdate = useCallback(
    (...args) => runSingleUpdateRef.current?.(...args),
    [],
  );

  const retry = usePurchaseOrderBulkEditRetry({
    failedRows: job?.failedRows || [],
    onFailedRowsChange: handleFailedRowsChange,
    runSingleUpdate,
  });

  const wrapRetry = useCallback(async (run) => {
    applyJobUpdate(setJob, jobRef, (prev) => (
      prev ? { ...prev, status: JOB_RUNNING } : prev
    ));
    try {
      await run();
    } finally {
      applyJobUpdate(setJob, jobRef, (prev) => {
        if (!prev) return null;
        if (!(prev.failedRows || []).length) return null;
        return { ...prev, status: JOB_NEEDS_ATTENTION, currentKey: null };
      });
    }
  }, []);

  const retryRow = useCallback(
    (key) => wrapRetry(() => retry.retryRow(key)),
    [retry.retryRow, wrapRetry],
  );
  const retryAllFailed = useCallback(
    () => wrapRetry(() => retry.retryAllFailed()),
    [retry.retryAllFailed, wrapRetry],
  );

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const dismissJob = useCallback(() => {
    if (isJobRunning(jobRef.current)) return;
    generationRef.current += 1;
    jobRef.current = null;
    setJob(null);
    setPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!isJobRunning(job)) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [job]);

  const value = useMemo(() => ({
    job,
    panelOpen,
    retryingBulk: retry.retryingBulk,
    startCorrectJob,
    retryRow,
    retryAllFailed,
    openPanel,
    closePanel,
    dismissJob,
  }), [
    closePanel,
    dismissJob,
    job,
    openPanel,
    panelOpen,
    retry.retryingBulk,
    retryAllFailed,
    retryRow,
    startCorrectJob,
  ]);

  return (
    <BulkWriteBackJobContext.Provider value={value}>
      {children}
    </BulkWriteBackJobContext.Provider>
  );
}
