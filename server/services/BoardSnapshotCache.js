'use strict';

// Gedeelde board-snapshotcache (rows + columns) voor features die dezelfde tb_cache-rijen nodig
// hebben als het board zelf, maar zonder er zelf op te schrijven: BI-aggregatie en RCCP-analyse.
// Eén zware TableDataService.read() wordt hergebruikt zolang de content-signatuur (dezelfde parts
// als de board-revision) niet wijzigt — dus tot de eerstvolgende sync/refresh/edit. Voorheen had
// alleen BI dit (lokaal in routes/bi.js); RCCP deed bij elke analyse/drill-down/vendor-hover een
// verse volledige read(). Uitgetild zodat beide features hetzelfde snapshot delen.

const { time } = require('../utils/timing');
const dataService = require('./TableDataService');

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const snapshotCache = new Map();

// Gescopeerd per (tableKey, supplierAccount): een supplier ziet via read() alleen zijn eigen
// rijen, dus zijn snapshot mag nooit hergebruikt worden voor een andere supplier of voor staff
// (supplierAccount = null, alle vendors).
function snapshotCacheKey(tableKey, supplierAccount) {
  return `${tableKey}::${supplierAccount || ''}`;
}

// Alleen content-bepalende delen; user-/settings-delen (bv. de gedeelde BI-weekfilter) laten de
// rijen ongemoeid en horen dus niet in de signatuur.
function contentSignature(parts = {}) {
  return JSON.stringify({
    syncedAt: parts.syncedAt ?? null,
    maxContentChangedAt: parts.maxContentChangedAt ?? null,
    maxFirstSeenAt: parts.maxFirstSeenAt ?? null,
    maxCustomValueAt: parts.maxCustomValueAt ?? null,
    maxLedgerAt: parts.maxLedgerAt ?? null,
    maxColumnsAt: parts.maxColumnsAt ?? null,
    exclusionCount: parts.exclusionCount ?? 0,
    maxExclusionAt: parts.maxExclusionAt ?? null,
  });
}

/**
 * Leest { rows, columns, revision } voor een tabel, met snapshot-hergebruik over meerdere
 * aanroepen (bv. meerdere BI-charts of een RCCP-analyse + drill-down) heen.
 * @param {{ tableKey: string, userId?: number|null, supplierAccount?: string|null }} params
 */
async function readBoardSnapshot({ tableKey, userId = null, supplierAccount = null } = {}) {
  const { revision, parts } = await time('snapshot_revision', () => dataService.getRevision({
    tableKey, userId, supplierAccount,
  }));
  const key = snapshotCacheKey(tableKey, supplierAccount);
  const signature = contentSignature(parts);
  const cached = snapshotCache.get(key);
  if (cached && cached.signature === signature && (Date.now() - cached.cachedAt) < SNAPSHOT_TTL_MS) {
    return { rows: cached.rows, columns: cached.columns, revision };
  }
  const data = await time('snapshot_board_read', () => dataService.read({ tableKey, userId, supplierAccount }));
  const columns = data.meta?.columns?.master || [];
  const rows = data.rows || [];
  snapshotCache.set(key, { rows, columns, signature, cachedAt: Date.now() });
  return { rows, columns, revision };
}

module.exports = { readBoardSnapshot };
