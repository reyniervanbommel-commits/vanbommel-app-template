/**
 * Optimistic history-flag: mark a column as having cell history without mutating input.
 * @param {Record<string, boolean>|null|undefined} existing
 * @param {string|number} columnId
 * @returns {Record<string, boolean>}
 */
export function withHistoryFlag(existing, columnId) {
  const colKey = String(columnId);
  if (existing && existing[colKey] === true) return existing;
  return { ...(existing || {}), [colKey]: true };
}
