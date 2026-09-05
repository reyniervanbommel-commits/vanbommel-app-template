'use strict';

// Gedeelde board-snapshotcache (rows + columns) voor features die dezelfde tb_cache-rijen nodig
// hebben als het board zelf, maar zonder er zelf op te schrijven: BI-aggregatie en RCCP-analyse.
// Eén zware TableDataService.read() wordt hergebruikt zolang de content-signatuur (dezelfde parts
// als de board-revision) niet wijzigt — dus tot de eerstvolgende sync/refresh/edit. Tot v1.54.11
// gold daarnaast een TTL van 5 minuten, waardoor een geldige cache toch werd weggegooid en de
// eerstvolgende bezoeker de volledige koude read betaalde; die TTL is vervangen door een ruim
// veiligheidsnet (zie SNAPSHOT_SAFETY_TTL_MS). Voorheen had
// alleen BI dit (lokaal in routes/bi.js); RCCP deed bij elke analyse/drill-down/vendor-hover een
// verse volledige read(). Uitgetild zodat beide features hetzelfde snapshot delen.

const { time } = require('../utils/timing');
const dataService = require('./TableDataService');

// Veiligheidsnet, géén versheidsmechanisme. De versheid komt volledig van de content-signatuur
// (zie contentSignature): elke schrijfweg die de board-inhoud raakt verandert minstens één
// signatuur-onderdeel, dus een ongewijzigde signatuur betekent ongewijzigde data. Beleid
// `perf-optimize-policy.json` → cache.crossPageTtlPolicy = "unlimited-until-revision".
// Deze ruime TTL vangt alleen het theoretische geval af dat er ooit een schrijfweg bijkomt die
// buiten de signatuur valt; hij verloopt in de praktijk nooit vóór een sync dat al doet.
// Was 5 minuten — dat verwierp een geldige cache ~1.400x te vroeg: koude RCCP-read 18,2 s
// tegen 8-13 ms warm (gemeten Azure DEV 2026-09-04, backlog BL-007).
const SNAPSHOT_SAFETY_TTL_MS = 12 * 60 * 60 * 1000;
const snapshotCache = new Map();
const kpiRowCache = new Map();

function snapshotCacheKey(tableKey, supplierAccount) {
  return `${tableKey}::${supplierAccount || ''}`;
}

function kpiCacheKey(tableKey, supplierAccount) {
  return `kpi::${snapshotCacheKey(tableKey, supplierAccount)}`;
}

function liveCache(entry) {
  return Boolean(entry) && (Date.now() - entry.cachedAt) < SNAPSHOT_SAFETY_TTL_MS;
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
    // Sync-filterregels (PO_SYNC_RULES) leven in app_settings. Een admin die de scope aanpast
    // markeert rijen out-of-scope zónder content_changed_at of last_full_sync_at te raken, dus
    // zonder dit veld zou de snapshot die rijen blijven tonen. Bewust NIET opgenomen: userViewedAt
    // en userBoardSettingsAt — dat zijn per-gebruiker-velden die een gedeeld snapshot niet mogen
    // invalideren.
    settingsAt: parts.settingsAt ?? null,
  });
}

/**
 * Gooit de gedeelde snapshots weg voor één tabel (of alles). Nodig bij schrijfwegen die de
 * zichtbaarheid van rijen wijzigen zonder een signatuur-veld te raken — zie saveSyncFilters.
 * De signatuur is de eerste verdediging; dit is de expliciete, zelfdocumenterende tweede.
 */
function invalidateBoardSnapshots({ tableKey = null } = {}) {
  if (!tableKey) {
    snapshotCache.clear();
    kpiRowCache.clear();
    return;
  }
  const prefix = `${tableKey}::`;
  const kpiPrefix = `kpi::${tableKey}::`;
  for (const key of snapshotCache.keys()) {
    if (key.startsWith(prefix)) snapshotCache.delete(key);
  }
  for (const key of kpiRowCache.keys()) {
    if (key.startsWith(kpiPrefix)) kpiRowCache.delete(key);
  }
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
  invalidateBoardSnapshots,
};
