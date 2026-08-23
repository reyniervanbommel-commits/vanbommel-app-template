'use strict';

function accumulateChunkFetchProgress(completedCount, chunkProgress, maxItems) {
  const cap = Number(maxItems);
  const hasCap = Number.isFinite(cap) && cap > 0;
  const chunkFetched = Number(chunkProgress?.fetched) || 0;
  const fetched = (Number(completedCount) || 0) + chunkFetched;
  return {
    fetched: hasCap ? Math.min(cap, fetched) : fetched,
    totalToFetch: hasCap ? cap : (chunkProgress?.totalToFetch ?? null),
    sourceTotal: chunkProgress?.sourceTotal ?? null,
    pagesFetched: chunkProgress?.pagesFetched,
    truncated: Boolean(chunkProgress?.truncated) || (hasCap && fetched >= cap),
  };
}

module.exports = { accumulateChunkFetchProgress };
