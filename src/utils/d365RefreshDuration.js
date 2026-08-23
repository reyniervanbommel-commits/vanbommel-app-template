/**
 * Duur van een D365-refreshrun, bijvoorbeeld `12m 04s`.
 * Input: ISO started/finished. Output: korte Engelse label.
 */
export function formatRefreshDuration(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '—';
  const totalSec = Math.round((end - start) / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export function refreshDurationLabel(startedAt, finishedAt, status) {
  if (!finishedAt && String(status || '') === 'running') return 'in progress';
  return formatRefreshDuration(startedAt, finishedAt);
}
