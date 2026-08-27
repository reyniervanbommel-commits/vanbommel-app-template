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
const kpiRowCache = new Map();

function snapshotCacheKey(tableKey, supplierAccount) {
  return `${tableKey}::${supplierAccount || ''}`;
}

function kpiCacheKey(tableKey, supplierAccount) {
  return `kpi::${snapshotCacheKey(tableKey, supplierAccount)}`;
}

function liveCache(entry) {
  return Boolean(entry) && (Date.now() - entry.cachedAt) < SNAPSHOT_TTL_MS;
}

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

// Een header-only board-read (includeDetails: false) heeft geen `details`-array op de rijen.
// Zulke rijen mogen de kpi-cache niet vullen: RCCP/BI-KPI's rekenen op PO-regels (open/delivered
// zitten op `details`), en een header-only snapshot zou ze permanent op 0 laten staan tot de
// volgende content-wijziging de signature verandert.
function snapshotHasDetails(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  return rows.some((row) => Array.isArray(row.details));
}

function rememberKpiPoRows({ tableKey, supplierAccount = null, signature, rows } = {}) {
  if (!tableKey || !signature || !rows) return;
  if (!snapshotHasDetails(rows)) return;
  kpiRowCache.set(kpiCacheKey(tableKey, supplierAccount), {
    rows,
    signature,
    cachedAt: Date.now(),
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
  if (cached && cached.signature === signature && liveCache(cached)) {
    rememberKpiPoRows({ tableKey, supplierAccount, signature, rows: cached.rows });
    return { rows: cached.rows, columns: cached.columns, revision };
  }
  const data = await time('snapshot_board_read', () => dataService.read({ tableKey, userId, supplierAccount }));
  const columns = data.meta?.columns?.master || [];
  const rows = data.rows || [];
  snapshotCache.set(key, { rows, columns, signature, cachedAt: Date.now() });
  rememberKpiPoRows({ tableKey, supplierAccount, signature, rows });
  return { rows, columns, revision };
}

/**
 * PO-rijen voor KPI/analyse: hergebruikt board-snapshot of kpi-cache, anders een lichte
 * read (alle kolommen + lookups, geen history/ledger/track). Optioneel revision/parts
 * meegeven zodat de caller getRevision niet dubbel hoeft te doen.
 */
async function readRccpPoRows({
  tableKey,
  supplierAccount = null,
  revision: knownRevision = null,
  parts: knownParts = null,
} = {}) {
  let revision = knownRevision;
  let parts = knownParts;
  if (revision == null || parts == null) {
    const got = await time('kpi_rows_revision', () => dataService.getRevision({
      tableKey, supplierAccount,
    }));
    revision = got.revision;
    parts = got.parts;
  }
  const signature = contentSignature(parts);
  const snap = snapshotCache.get(snapshotCacheKey(tableKey, supplierAccount));
  if (snap && snap.signature === signature && liveCache(snap) && snapshotHasDetails(snap.rows)) {
    rememberKpiPoRows({ tableKey, supplierAccount, signature, rows: snap.rows });
    return { rows: snap.rows, revision };
  }
  const cached = kpiRowCache.get(kpiCacheKey(tableKey, supplierAccount));
  if (cached && cached.signature === signature && liveCache(cached) && snapshotHasDetails(cached.rows)) {
    return { rows: cached.rows, revision };
  }
  const data = await time('kpi_po_read', () => dataService.read({
    tableKey,
    supplierAccount,
    includeChangeDecorations: false,
  }));
  const rows = data.rows || [];
  rememberKpiPoRows({ tableKey, supplierAccount, signature, rows });
  return { rows, revision };
}

module.exports = {
  readBoardSnapshot,
  readRccpPoRows,
  rememberKpiPoRows,
  contentSignature,
};
