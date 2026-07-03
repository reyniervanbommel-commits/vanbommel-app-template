'use strict';

// Generieke D365 OData SourceProvider (#AB:161, Fase B van #139). Haalt een WILLEKEURIGE, platte
// (master-only) entiteit op op basis van tb_tables.source_entity + de actieve bron-kolommen (tb_columns).
// Bron-neutraal contract: geeft records terug in de vorm die TableDataService.refresh() verwacht
// ({ partitionKey, recordKey, modifiedAt, master, details }). Master-detail-entiteiten (bv. PO met
// $expand naar lines) lopen in Fase A/B nog via een bespoke adapter; die worden hier bewust geweigerd.

const { logger } = require('../../utils/logger');
const settingsService = require('../SettingsService');
const { getBaseUrl, fetchODataJson, escapeODataLiteral } = require('../D365ODataService');
const { listColumns } = require('../TableRegistryService');

const DEFAULT_PAGE_SIZE = 500;
const DEFAULT_TIMEOUT_MS = 20000;

// '/data/VendorsV2' blijft; 'VendorsV2' wordt '/data/VendorsV2'.
// sourceEntity is admin-config (tb_tables), maar we valideren defensief: alleen letters/cijfers/_/'/'.
// Zo kan een waarde met '../', spaties of query-tekens het pad nooit buiten de D365 base-URL verleggen.
function normalizeEntityPath(sourceEntity) {
  const s = String(sourceEntity || '').trim();
  if (!s) throw Object.assign(new Error('tb_tables.source_entity ontbreekt'), { status: 500 });
  const path = s.startsWith('/') ? s : `/data/${s}`;
  if (!/^\/[A-Za-z0-9_/]+$/.test(path)) {
    throw Object.assign(new Error(`Ongeldige source_entity '${sourceEntity}'`), { status: 500 });
  }
  return path;
}

function resolveNext(nextLink, baseUrl) {
  try {
    return new URL(nextLink, baseUrl).toString();
  } catch {
    return null;
  }
}

async function fetch(table) {
  if (table.relation && table.relation.kind && table.relation.kind !== 'none') {
    throw Object.assign(
      new Error(`D365ODataProvider ondersteunt (nog) geen detail-relatie voor '${table.key}'`),
      { status: 501 },
    );
  }

  const baseUrl = await getBaseUrl();
  const company = (await settingsService.getAsync('D365_ODATA_COMPANY', '')).trim();
  const rawTimeout = Number.parseInt(await settingsService.getAsync('D365_ODATA_TIMEOUT_MS', String(DEFAULT_TIMEOUT_MS)), 10);
  const timeout = Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : DEFAULT_TIMEOUT_MS;
  const maxRows = Number.isFinite(table.maxRows) && table.maxRows > 0 ? table.maxRows : 2000;

  const masterCols = (await listColumns({ tableId: table.id, scope: 'master', includeInactive: false }))
    .filter((c) => c.source === 'source' && c.sourceField);

  // Sleutelvelden: partition = dataAreaId (als aanwezig in key_fields), record = de overige sleutelvelden.
  const keyFields = Array.isArray(table.keyFields) ? table.keyFields : [];
  const partitionField = keyFields.find((f) => f.toLowerCase() === 'dataareaid') || 'dataAreaId';
  const recordKeyFields = keyFields.filter((f) => f.toLowerCase() !== 'dataareaid');
  if (recordKeyFields.length === 0) {
    throw Object.assign(new Error(`tb_tables.key_fields voor '${table.key}' mist een record-sleutel`), { status: 500 });
  }

  // $select: sleutelvelden + alle bron-velden (dedup). Geen ModifiedDateTime: niet elke entiteit exposeert die.
  const selectSet = new Set([partitionField, ...recordKeyFields, ...masterCols.map((c) => c.sourceField)]);
  const select = [...selectSet].join(',');

  const firstUrl = () => {
    const u = new URL(baseUrl + normalizeEntityPath(table.sourceEntity));
    u.searchParams.set('cross-company', 'true');
    if (company) u.searchParams.set('$filter', `${partitionField} eq '${escapeODataLiteral(company)}'`);
    u.searchParams.set('$select', select);
    u.searchParams.set('$count', 'true');
    u.searchParams.set('$top', String(Math.min(DEFAULT_PAGE_SIZE, maxRows)));
    return u.toString();
  };

  const records = [];
  let total = null;
  let url = firstUrl();

  while (url && records.length < maxRows) {
    const payload = await fetchODataJson(url, timeout);
    if (total === null && typeof payload['@odata.count'] === 'number') total = payload['@odata.count'];
    const batch = Array.isArray(payload.value) ? payload.value : [];
    for (const raw of batch) {
      if (records.length >= maxRows) break;
      const partitionKey = String(raw[partitionField] ?? company ?? '').trim();
      const recordKey = recordKeyFields.map((f) => String(raw[f] ?? '').trim()).join('|');
      if (!partitionKey || !recordKey) continue;
      const master = {};
      for (const col of masterCols) master[col.key] = raw[col.sourceField] ?? null;
      records.push({ partitionKey, recordKey, modifiedAt: raw.ModifiedDateTime || null, master, details: [] });
    }
    const next = payload['@odata.nextLink'];
    url = next && records.length < maxRows ? resolveNext(next, baseUrl) : null;
  }

  const truncated = total !== null ? total > records.length : false;
  logger.info('D365ODataProvider fetch', {
    tableKey: table.key, entity: table.sourceEntity, records: records.length, total, truncated,
  });
  return { records, total, truncated };
}

module.exports = { fetch, normalizeEntityPath };
