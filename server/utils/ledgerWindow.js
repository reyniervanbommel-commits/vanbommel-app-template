'use strict';

const LEDGER_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function toMs(value) {
  if (value === null || value === undefined || value === '') return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Ledger-venster voor new/changed-kaders.
 * baseline = last_viewed_at ?? last_full_sync_at
 * sinceMs = baseline == null ? null : max(baseline, now - 14d)
 */
function resolveLedgerSinceMs({ lastViewedAt, lastFullSyncAt, now = Date.now() } = {}) {
  const viewedMs = toMs(lastViewedAt);
  const syncedMs = toMs(lastFullSyncAt);
  const baseline = viewedMs !== null ? viewedMs : syncedMs;
  if (baseline === null) return null;
  return Math.max(baseline, Number(now) - LEDGER_WINDOW_MS);
}

function usesViewedBaseline(lastViewedAt) {
  return toMs(lastViewedAt) !== null;
}

module.exports = {
  LEDGER_WINDOW_MS,
  resolveLedgerSinceMs,
  usesViewedBaseline,
};
