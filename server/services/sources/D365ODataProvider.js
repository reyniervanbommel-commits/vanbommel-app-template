'use strict';

// D365ODataProvider — implementeert het SourceProvider-contract voor Dynamics 365 F&O (#139, Fase B).
// Wrapt de bestaande D365ODataService. In Fase B blijft fetch() voor de PO-entiteit functioneel
// identiek aan de oude purchaseOrdersFetch-adapter (PO-pariteit): dezelfde mapping, dezelfde
// records-vorm. discoverFields() is nieuw: het haalt het D365 $metadata-document op en parseert de
// EntityTypes/Properties/NavigationProperties (zelfde regex-aanpak als scripts/d365/inspect-metadata.mjs).
//
// Strangler-fig: de hardcoded PO-mapping die eerst in TableDataService.js stond, verhuist hierheen.
// Geen andere laag kent D365; dit bestand is het enige raakvlak.

const { SourceProvider } = require('./SourceProvider');
const { logger } = require('../../utils/logger');
const settingsService = require('../SettingsService');
const {
  fetchPurchaseOrders,
  writeBackField,
  buildHeaders,
  getBaseUrl,
  getAccessToken,
} = require('../D365ODataService');

const METADATA_PATH = '/data/$metadata';
const METADATA_TTL_MS = 10 * 60 * 1000; // 10 minuten in-memory cache voor het (grote) $metadata-document.
const DEFAULT_METADATA_TIMEOUT_MS = 20000;

// Sampling: korte, vaste $top-fetch om representatieve voorbeeldwaarden per veld te tonen in de picker.
// Bewust klein en faalt-veilig: sampling mag discovery NOOIT laten crashen of vertragen.
const SAMPLE_TOP = 3;
const SAMPLE_TIMEOUT_MS = 6000;
const SAMPLE_MAX_LEN = 60;
// Aantal distinct voorbeeldwaarden dat we per veld tonen in de picker. Uit dezelfde SAMPLE_TOP-rijen,
// dus geen extra fetch: één voorbeeld gaf te weinig gevoel voor de data, meerdere maakt het type duidelijk.
const SAMPLE_MAX_PER_FIELD = 3;

// In-memory $metadata-cache (per baseUrl). Voorkomt dat elke discover-call het volledige document ophaalt.
const _metadataCache = new Map(); // baseUrl -> { xml, expiresAt }

// ---------------------------------------------------------------------------
// EDM-type -> app data_type mapping.
// EDM-primitieven staan als "Edm.String", "Edm.Decimal", enz. in $metadata. Enums (custom types)
// mappen we op 'select'; onbekende/complexe types vallen terug op 'text'.
// ---------------------------------------------------------------------------
function edmToDataType(edmType) {
  const t = String(edmType || '').replace(/^Collection\(/, '').replace(/\)$/, '');
  if (t === 'Edm.Boolean') return 'boolean';
  if (
    t === 'Edm.Int16' || t === 'Edm.Int32' || t === 'Edm.Int64' ||
    t === 'Edm.Decimal' || t === 'Edm.Double' || t === 'Edm.Single' || t === 'Edm.Byte'
  ) {
    return 'number';
  }
  if (
    t === 'Edm.Date' || t === 'Edm.DateTimeOffset' || t === 'Edm.DateTime' ||
    t === 'Edm.Time' || t === 'Edm.TimeOfDay'
  ) {
    return 'date';
  }
  if (t === 'Edm.String' || t === 'Edm.Guid') return 'text';
  // Niet-Edm (bv. Microsoft.Dynamics.DataEntities.NoYes of een enum-type) -> keuzelijst.
  if (t && !t.startsWith('Edm.')) return 'select';
  return 'text';
}

// Normaliseer een bron-waarde naar een korte weergave-string voor de veld-sample.
// - null/undefined/'' -> null (geen bruikbare sample).
// - Datums (ISO met 'T') -> alleen het datum-deel (YYYY-MM-DD).
// - Objecten/arrays -> compacte JSON.
// - Lange strings -> afgekapt op SAMPLE_MAX_LEN met ellipsis.
function normalizeSample(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  let str;
  if (typeof value === 'object') {
    try { str = JSON.stringify(value); } catch { str = String(value); }
  } else {
    str = String(value);
  }
  str = str.trim();
  if (!str) return null;
  // ISO-datum/tijd -> alleen datum-deel.
  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})T[\d:.]+/);
  if (isoMatch) str = isoMatch[1];
  if (str.length > SAMPLE_MAX_LEN) str = str.slice(0, SAMPLE_MAX_LEN - 1).trimEnd() + '…';
  return str || null;
}

// Kort, leesbaar label uit een PascalCase-veldnaam ("PurchaseOrderNumber" -> "Purchase Order Number").
function humanizeFieldName(field) {
  return String(field || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// $metadata ophalen (met in-memory TTL-cache) en parsen.
// ---------------------------------------------------------------------------
async function fetchMetadataXml() {
  const baseUrl = await getBaseUrl();
  const cached = _metadataCache.get(baseUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return { xml: cached.xml, baseUrl };
  }

  const timeoutRaw = await settingsService.getAsync('D365_ODATA_TIMEOUT_MS', String(DEFAULT_METADATA_TIMEOUT_MS));
  const timeout = Number.parseInt(timeoutRaw, 10) || DEFAULT_METADATA_TIMEOUT_MS;

  // Auth-headers hergebruiken; $metadata is XML, dus expliciet Accept overschrijven.
  const headers = { ...(await buildHeaders()), Accept: 'application/xml' };

  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), timeout);
  let response;
  try {
    response = await fetch(baseUrl + METADATA_PATH, { method: 'GET', headers, signal: controller.signal });
  } catch (error) {
    const err = new Error('D365 $metadata is niet bereikbaar');
    err.status = error && error.name === 'AbortError' ? 504 : 502;
    throw err;
  } finally {
    clearTimeout(handle);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logger.error('D365 $metadata ophalen mislukt', { status: response.status, bodyPreview: body.slice(0, 300) });
    const err = new Error('Kon D365 $metadata niet ophalen');
    err.status = 502;
    throw err;
  }

  const xml = await response.text();
  _metadataCache.set(baseUrl, { xml, expiresAt: Date.now() + METADATA_TTL_MS });
  return { xml, baseUrl };
}

// Haal ~SAMPLE_TOP rijen op uit een entiteit (optioneel met detail-expand) en bouw een sample-map:
//   { 'master|<Field>': [<sample>, ...], 'detail|<Field>': [<sample>, ...] }
// Verzamelt per veld tot SAMPLE_MAX_PER_FIELD distinct niet-lege waarden over de opgehaalde rijen.
// Faalt-veilig: elke fout of timeout -> lege map (discovery valt dan terug op een lege lijst). Vaste
// kleine $top; geen paging.
async function fetchFieldSamples({ masterEntity, navName }) {
  const samples = new Map();
  let baseUrl;
  try {
    baseUrl = await getBaseUrl();
  } catch {
    return samples; // Geen bron-config -> geen samples (faalt-veilig).
  }

  // Master-samples: lichte fetch ZÓNDER expand. Dit is snel (~1s) en betrouwbaar; een detail-expand
  // maakt dezelfde call juist zwaar (bv. PO+lines: ~22s -> timeout), dus die halen we apart op.
  const masterUrl = new URL(baseUrl + '/data/' + masterEntity);
  masterUrl.searchParams.set('$top', String(SAMPLE_TOP));
  masterUrl.searchParams.set('$count', 'false');
  masterUrl.searchParams.set('cross-company', 'true');
  for (const row of await fetchSampleRows(masterUrl)) {
    collectRowSamples(row, 'master', samples);
  }

  // Detail-samples: aparte, faalt-veilige fetch mét expand op één master-rij (best-effort). Slaagt dit
  // niet binnen de timeout, dan houden de detail-velden gewoon sample:null; master-samples blijven staan.
  if (navName) {
    const detailUrl = new URL(baseUrl + '/data/' + masterEntity);
    detailUrl.searchParams.set('$top', '1');
    detailUrl.searchParams.set('$count', 'false');
    detailUrl.searchParams.set('cross-company', 'true');
    detailUrl.searchParams.set('$expand', navName);
    for (const row of await fetchSampleRows(detailUrl)) {
      if (Array.isArray(row[navName])) {
        for (const detail of row[navName]) collectRowSamples(detail, 'detail', samples);
      }
    }
  }
  return samples;
}

// Haalt de rijen (payload.value) van een sample-URL op met korte timeout. Faalt-veilig: elke
// fout/timeout/niet-ok -> lege array, zodat sampling discovery nooit breekt.
async function fetchSampleRows(url) {
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), SAMPLE_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), { method: 'GET', headers: await buildHeaders(), signal: controller.signal });
    if (!response || !response.ok) return [];
    const payload = await response.json().catch(() => null);
    return payload && Array.isArray(payload.value) ? payload.value : [];
  } catch {
    return [];
  } finally {
    clearTimeout(handle);
  }
}

// Verzamel per (scope, field) tot SAMPLE_MAX_PER_FIELD distinct niet-lege samples in de map (arrays).
function collectRowSamples(row, scope, samples) {
  if (!row || typeof row !== 'object') return;
  for (const [field, value] of Object.entries(row)) {
    if (field.startsWith('@') || field.startsWith('#')) continue; // OData-annotaties overslaan.
    const key = scope + '|' + field;
    const norm = normalizeSample(value);
    if (norm === null) continue;
    let list = samples.get(key);
    if (!list) { list = []; samples.set(key, list); }
    // Alleen distinct waarden, en niet meer dan het maximum per veld.
    if (list.length < SAMPLE_MAX_PER_FIELD && !list.includes(norm)) list.push(norm);
  }
}

// Parse alle <EntitySet Name="..." EntityType="..."/>-elementen uit het $metadata-document.
// Vorm: <EntitySet Name="PurchaseOrderHeadersV2" EntityType="Microsoft.Dynamics.DataEntities.PurchaseOrderHeaderV2" />
// De Name = het pad-segment; sourceEntity krijgt de vorm '/data/<Name>'. Gesorteerd op name (case-insensitive).
function parseEntitySets(xml) {
  const out = [];
  const seen = new Set();
  const re = /<EntitySet\s+([^>]*?)\/?>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const name = (attrs.match(/\bName="([^"]+)"/) || [])[1];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const entityType = (attrs.match(/\bEntityType="([^"]+)"/) || [])[1] || null;
    out.push({ name, sourceEntity: '/data/' + name, entityType });
  }
  out.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  return out;
}

// Knip het document in <EntityType ...>...</EntityType>-blokken en index op naam (hoofdletterongevoelig).
function indexEntityTypes(xml) {
  const blocks = xml.match(/<EntityType\b[\s\S]*?<\/EntityType>/g) || [];
  const byName = new Map();
  for (const block of blocks) {
    const name = (block.match(/<EntityType\s+Name="([^"]+)"/) || [])[1] || '';
    if (name) byName.set(name.toLowerCase(), { name, block });
  }
  return byName;
}

// Alle scalar Properties (dus geen NavigationProperty) uit één EntityType-blok halen.
function parseEntityProperties(block, scope) {
  const props = [];
  const propRe = /<Property\s+([^>]*?)\/?>/g;
  let m;
  while ((m = propRe.exec(block)) !== null) {
    const attrs = m[1];
    const name = (attrs.match(/\bName="([^"]+)"/) || [])[1];
    const type = (attrs.match(/\bType="([^"]+)"/) || [])[1];
    if (!name || !type) continue;
    const nullableAttr = (attrs.match(/\bNullable="([^"]+)"/) || [])[1];
    props.push({
      field: name,
      label: humanizeFieldName(name),
      dataType: edmToDataType(type),
      scope,
      // In EDM is Nullable standaard true als het attribuut ontbreekt.
      nullable: nullableAttr ? nullableAttr === 'true' : true,
    });
  }
  return props;
}

// Resolve de doel-EntityType van een NavigationProperty (bv. "PurchaseOrderLines") in de master-entiteit.
function resolveNavTargetType(masterBlock, navName) {
  const navRe = new RegExp(`<NavigationProperty\\s+Name="${navName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}"\\s+Type="([^"]+)"`, 'i');
  const match = masterBlock.match(navRe);
  if (!match) return null;
  // Type is bv. "Collection(Microsoft.Dynamics.DataEntities.PurchaseOrderLineV2)" -> laatste segment.
  return match[1].replace(/^Collection\(/, '').replace(/\)$/, '').replace(/^.*\./, '');
}

// Parse ALLE <NavigationProperty Name="..." Type="..."/> uit één EntityType-blok. Elke nav-property is
// een relatie-kandidaat: master→N-detail als de Type een Collection(...) is (isCollection=true), anders
// een 0..1-referentie. `targetEntityType` = het laatste segment van de (evt. ontwrapte) Type.
// Vorm in $metadata: <NavigationProperty Name="PurchaseOrderLines" Type="Collection(Ns.PurchaseOrderLineV2)"/>
function parseNavigationProperties(block) {
  const out = [];
  const seen = new Set();
  const navRe = /<NavigationProperty\s+([^>]*?)\/?>/g;
  let m;
  while ((m = navRe.exec(block)) !== null) {
    const attrs = m[1];
    const name = (attrs.match(/\bName="([^"]+)"/) || [])[1];
    const type = (attrs.match(/\bType="([^"]+)"/) || [])[1];
    if (!name || !type || seen.has(name)) continue;
    seen.add(name);
    const isCollection = /^Collection\(/.test(type);
    const targetEntityType = type
      .replace(/^Collection\(/, '')
      .replace(/\)$/, '')
      .replace(/^.*\./, '');
    out.push({ name, targetEntityType, isCollection });
  }
  // Collection-navigaties (master→N-detail-kandidaten) eerst, daarna alfabetisch op naam.
  out.sort((a, b) => {
    if (a.isCollection !== b.isCollection) return a.isCollection ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
  return out;
}

// Uit "/data/PurchaseOrderHeadersV2" of "PurchaseOrderHeadersV2" -> "PurchaseOrderHeadersV2".
function entitySetName(sourceEntity) {
  return String(sourceEntity || '').replace(/^\/?data\//i, '').replace(/^\//, '').trim();
}

class D365ODataProvider extends SourceProvider {
  capabilities() {
    return {
      discoverFields: true,
      discoverEntities: true,
      discoverRelations: true,
      serverFilter: true,
      serverPaging: true,
      masterDetail: true,
      writeBack: true,
      needsCache: true,
    };
  }

  /**
   * Lichte verbindingstest: bevestigt dat de bron geconfigureerd is (base-URL) en dat OAuth een token
   * levert. Haalt bewust NIET het volledige $metadata (57MB) op — dat is te zwaar voor een verbindingstest
   * en verloopt op een koude cache makkelijk in een timeout. De echte $metadata wordt pas bij discovery
   * opgehaald (en dan gecachet).
   * @returns {Promise<boolean>}
   */
  async ping() {
    const baseUrl = await getBaseUrl(); // gooit met een duidelijke fout als de base-URL ontbreekt
    if (!baseUrl) throw Object.assign(new Error('D365-basis-URL ontbreekt'), { status: 400 });
    const timeout = new Promise((_, reject) => setTimeout(
      () => reject(Object.assign(new Error('D365-authenticatie duurde te lang (timeout)'), { status: 504 })),
      12000,
    ));
    await Promise.race([getAccessToken(), timeout]); // bevestigt tenant/client/secret + Azure AD-bereik
    return true;
  }

  /**
   * Ontdek alle beschikbare entiteiten (EntitySets) via $metadata, zodat de admin er één kan KIEZEN.
   * Hergebruikt de gecachete $metadata-XML. Return gesorteerd op name.
   * @returns {Promise<Array<{name:string, sourceEntity:string, entityType:string|null}>>}
   */
  async discoverEntities() {
    const { xml } = await fetchMetadataXml();
    return parseEntitySets(xml);
  }

  /**
   * Ontdek de relatie-kandidaten (NavigationProperties) van de master-entiteit, zodat de admin de
   * detail-entiteit KIEST i.p.v. typt. Hergebruikt de gecachete $metadata + de EntityType-index.
   * Collection-navigaties (master→N-detail) staan vooraan/gemarkeerd (isCollection=true).
   * @param {{ sourceEntity: string }} _args
   * @returns {Promise<Array<{name:string, targetEntityType:string, isCollection:boolean}>>}
   */
  async discoverRelations({ sourceEntity } = {}) {
    const masterEntity = entitySetName(sourceEntity);
    if (!masterEntity) {
      throw Object.assign(new Error('Geen bron-entiteit opgegeven voor relatie-discovery'), { status: 400 });
    }
    const { xml } = await fetchMetadataXml();
    const byName = indexEntityTypes(xml);
    const master = findEntityType(byName, masterEntity);
    if (!master) {
      throw Object.assign(new Error(`Entiteit '${masterEntity}' niet gevonden in D365 $metadata`), { status: 404 });
    }
    return parseNavigationProperties(master.block);
  }

  /**
   * Ontdek master- + detailvelden via $metadata. De master-entiteit komt uit sourceEntity; de
   * detail-entiteit uit relation.detailSourceEntity (nav-property op de master).
   * Elk veld krijgt `samples`: tot enkele representatieve niet-lege waarden uit echte data (lichte
   * $top-fetch), plus `sample` (de eerste, voor achterwaartse compatibiliteit). Sampling is faalt-veilig:
   * mislukt/leeg -> samples:[] / sample:null; discovery crasht er nooit door.
   */
  async discoverFields({ sourceEntity, relation } = {}) {
    const masterEntity = entitySetName(sourceEntity);
    if (!masterEntity) {
      throw Object.assign(new Error('Geen bron-entiteit opgegeven voor velddiscovery'), { status: 400 });
    }

    const { xml } = await fetchMetadataXml();
    const byName = indexEntityTypes(xml);

    // D365 entity-sets heten meestal net iets anders dan de EntityType. Probeer eerst exact,
    // dan zonder trailing "V2"/"V3", dan enkelvoud (drop trailing 's').
    const master = findEntityType(byName, masterEntity);
    if (!master) {
      throw Object.assign(new Error(`Entiteit '${masterEntity}' niet gevonden in D365 $metadata`), { status: 404 });
    }

    const fields = parseEntityProperties(master.block, 'master');

    // Detail-velden via de nav-property (indien een expand-relatie geconfigureerd is).
    const navName = relation && relation.detailSourceEntity && relation.kind !== 'none'
      ? relation.detailSourceEntity
      : null;
    if (navName) {
      const targetType = resolveNavTargetType(master.block, navName);
      const detail = targetType ? findEntityType(byName, targetType) : null;
      if (detail) {
        fields.push(...parseEntityProperties(detail.block, 'detail'));
      } else {
        logger.warn('Detail-entiteit van nav-property niet gevonden in $metadata', { navName, targetType });
      }
    }

    // Voorbeelddata per veld (faalt-veilig). De expand voor detail-samples werkt alleen bij een echte
    // nav-property; anders krijgen detail-velden sample:null.
    const samples = await fetchFieldSamples({ masterEntity, navName });
    return fields.map((f) => {
      const list = samples.get(`${f.scope}|${f.field}`) || [];
      return { ...f, samples: list, sample: list[0] ?? null };
    });
  }

  /**
   * Haal rijen op. De PurchaseOrderHeaders-entiteit houdt het bestaande, verrijkte pad
   * (fetchPurchaseOrders, incl. vendorName-verrijking) voor PO-pariteit. Elke andere entiteit gebruikt
   * de GENERIEKE fetch (#141): $select uit de gecureerde velden, $expand uit de relatie, $filter uit het
   * standaardfilter, natuurlijke sleutel uit key_fields — records gekeyd op col.key (zodat de projectie
   * en generieke curatie aansluiten).
   */
  async fetch({ table, columns, relation } = {}) {
    if (!table) throw Object.assign(new Error('Geen tabel opgegeven voor fetch'), { status: 400 });
    if (/PurchaseOrderHeaders/i.test(table.sourceEntity || '')) return purchaseOrdersFetch(table);
    return genericFetch({ table, columns, relation: relation || table.relation });
  }

  /**
   * Dunne wrapper rond de bestaande write-back (Fase B: nog niet via routes ontsloten).
   */
  async writeField({ level, dataAreaId, orderNumber, lineNumber, field, value, basedOnValue } = {}) {
    return writeBackField({
      level, dataAreaId, orderNumber, lineNumber,
      d365Field: field, newValue: value, basedOnValue,
    });
  }
}

// Zoek een EntityType op naam met tolerante fallbacks. D365 entity-sets heten vaak in het meervoud
// met een V-suffix (bv. "PurchaseOrderHeadersV2") terwijl de EntityType enkelvoud is
// ("PurchaseOrderHeaderV2"). We proberen elke combinatie van: exact / zonder V-suffix / enkelvoud.
function findEntityType(byName, wanted) {
  const base = String(wanted || '').toLowerCase();
  const version = (base.match(/v\d+$/) || [''])[0];       // bv. "v2"
  const stem = base.replace(/v\d+$/, '');                  // "purchaseorderheaders"
  const singularStem = stem.replace(/s$/, '');             // "purchaseorderheader"

  const candidates = [
    base,                       // purchaseorderheadersv2
    stem,                       // purchaseorderheaders
    singularStem + version,     // purchaseorderheaderv2
    singularStem,               // purchaseorderheader
  ];
  for (const c of candidates) {
    if (c && byName.has(c)) return byName.get(c);
  }
  return null;
}

// ---------------------------------------------------------------------------
// PO-fetch — verhuisd uit TableDataService.js (PO-pariteit). Levert de generieke records-vorm.
// ---------------------------------------------------------------------------
function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Generieke OData-fetch (#141): werkt voor ELKE D365-entiteit. Bouwt $select uit de gecureerde bronvelden,
// $expand uit de relatie, $filter uit het standaardfilter, natuurlijke sleutel uit key_fields. Records
// worden gekeyd op col.key (uit row[col.sourceField]) zodat de projectie in TableDataService én de
// generieke curatie exact aansluiten. Paging via @odata.nextLink tot maxRows.
// ---------------------------------------------------------------------------
function uniqStrings(arr) { return [...new Set((arr || []).filter(Boolean))]; }

async function fetchAllRows(startUrl, max) {
  const rows = [];
  let next = startUrl;
  let guard = 0;
  while (next && rows.length < max && guard < 200) {
    guard += 1;
    const controller = new AbortController();
    const handle = setTimeout(() => controller.abort(), 60000);
    let payload;
    try {
      const res = await fetch(next, { headers: await buildHeaders(), signal: controller.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const err = new Error(`D365-bron antwoordde met status ${res.status}`);
        err.status = res.status >= 400 && res.status < 500 ? 400 : 502;
        logger.warn('Generieke fetch: bron-fout', { status: res.status, bodyPreview: body.slice(0, 300) });
        throw err;
      }
      payload = await res.json();
    } finally {
      clearTimeout(handle);
    }
    for (const r of (Array.isArray(payload.value) ? payload.value : [])) {
      if (rows.length >= max) break;
      rows.push(r);
    }
    next = payload['@odata.nextLink'] || null; // D365 geeft een absolute nextLink met behoud van de query.
  }
  return rows;
}

async function genericFetch({ table, columns, relation }) {
  const baseUrl = (await getBaseUrl()).replace(/\/+$/, '');
  const entity = entitySetName(table.sourceEntity);
  if (!entity) throw Object.assign(new Error('Geen bron-entiteit voor fetch'), { status: 400 });

  const masterCols = ((columns && columns.master) || []).filter((c) => c.source === 'source' && c.sourceField);
  const detailCols = ((columns && columns.detail) || []).filter((c) => c.source === 'source' && c.sourceField);
  const keyFields = Array.isArray(table.keyFields) ? table.keyFields : [];
  const navName = relation && relation.detailSourceEntity && relation.kind !== 'none' ? relation.detailSourceEntity : null;
  const detailKeyFields = relation && Array.isArray(relation.detailKeyFields) ? relation.detailKeyFields : [];

  // Partitie = een company-achtig sleutelveld (dataAreaId); record = de overige sleutelvelden.
  const partitionField = keyFields.find((f) => /dataarea|company|legalentity/i.test(f)) || 'dataAreaId';
  const recordFields = keyFields.filter((f) => f !== partitionField);

  // Let op: NIET ModifiedDateTime hardcoderen in $select — veel (regel-)entiteiten hebben dat veld niet,
  // wat een 400 geeft. modifiedAt is dus best-effort (alleen als de bron het veld toevallig meelevert).
  const masterSelect = uniqStrings([partitionField, 'dataAreaId', ...recordFields, ...masterCols.map((c) => c.sourceField)]);
  const url = new URL(baseUrl + '/data/' + entity);
  url.searchParams.set('cross-company', 'true');
  if (masterSelect.length) url.searchParams.set('$select', masterSelect.join(','));
  if (navName) {
    const detailSelect = uniqStrings([...detailKeyFields, ...detailCols.map((c) => c.sourceField)]);
    url.searchParams.set('$expand', detailSelect.length ? `${navName}($select=${detailSelect.join(',')})` : navName);
  }
  const filter = String(table.defaultFilter || '').trim();
  if (filter) url.searchParams.set('$filter', filter);
  const maxRows = Number.isFinite(table.maxRows) && table.maxRows > 0 ? table.maxRows : 2000;
  url.searchParams.set('$top', String(Math.min(maxRows, 500)));

  const rows = await fetchAllRows(url.toString(), maxRows);
  const detailKeyField = detailKeyFields[0] || null;

  const records = [];
  for (const row of rows) {
    const partitionKey = String(row[partitionField] ?? row.dataAreaId ?? '').trim().slice(0, 32);
    const recordKey = (recordFields.length ? recordFields : keyFields)
      .map((f) => row[f]).filter((v) => v !== undefined && v !== null && v !== '').join('|').slice(0, 128);
    if (!recordKey) continue;
    const master = {};
    for (const c of masterCols) master[c.key] = row[c.sourceField] ?? null;
    const detailArr = navName && Array.isArray(row[navName]) ? row[navName] : [];
    const details = detailArr.map((line, idx) => {
      let dk = idx;
      if (detailKeyField) { const n = Number.parseInt(line[detailKeyField], 10); if (Number.isFinite(n)) dk = n; }
      const values = {};
      for (const c of detailCols) values[c.key] = line[c.sourceField] ?? null;
      return { detailKey: dk, values };
    });
    records.push({ partitionKey, recordKey, modifiedAt: row.ModifiedDateTime || null, master, details });
  }
  return { records, total: records.length, truncated: rows.length >= maxRows };
}

async function purchaseOrdersFetch(table) {
  const company = (await settingsService.getAsync('D365_ODATA_COMPANY', '')).trim();
  // Per-tabel standaardfilter (tb_tables.default_filter_json) wint van de globale PO_SYNC_FILTER, zodat een
  // Table-Builder-tabel bv. alleen open orders kan ophalen. Valt terug op de env als de tabel geen filter heeft.
  const extraFilter = (table.defaultFilter || await settingsService.getAsync('PO_SYNC_FILTER', '') || '').trim();
  // Per-tabel maxRows wint; PO_SYNC_MAX_ORDERS blijft de globale fallback.
  const rawMax = table.maxRows || await settingsService.getAsync('PO_SYNC_MAX_ORDERS', '2000');
  const parsedMax = Number.parseInt(rawMax, 10);
  const maxItems = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : (table.maxRows || 2000);

  const result = await fetchPurchaseOrders({ supplierAccount: null, fetchAll: true, extraFilter, maxItems });
  const items = Array.isArray(result.items) ? result.items : [];

  const records = items.map((order) => {
    const raw = order.raw || {};
    return {
      partitionKey: String(raw.dataAreaId || company || '').trim(),
      recordKey: String(order.orderNumber || raw.PurchaseOrderNumber || '').trim(),
      modifiedAt: raw.ModifiedDateTime || null,
      master: {
        orderNumber: order.orderNumber,
        vendorAccount: order.vendorAccount,
        vendorName: order.vendorName,
        status: order.status,
        currencyCode: order.currencyCode,
        requestedDeliveryDate: order.requestedDeliveryDate,
        createdDateTime: order.createdDateTime,
      },
      details: (Array.isArray(order.lines) ? order.lines : []).map((line) => ({
        detailKey: toNumberOrNull(line.lineNumber),
        values: {
          lineNumber: line.lineNumber,
          itemNumber: line.itemNumber,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          lineAmount: line.lineAmount,
          currencyCode: line.currencyCode,
          requestedDeliveryDate: line.requestedDeliveryDate,
        },
      })),
    };
  });
  return { records, total: result.total, truncated: Boolean(result.truncated) };
}

function __resetMetadataCache() {
  _metadataCache.clear();
}

module.exports = {
  D365ODataProvider,
  // Geëxporteerd voor unit-tests (DB-/netwerk-vrij):
  edmToDataType,
  humanizeFieldName,
  parseEntityProperties,
  parseEntitySets,
  indexEntityTypes,
  resolveNavTargetType,
  parseNavigationProperties,
  entitySetName,
  findEntityType,
  normalizeSample,
  __resetMetadataCache,
};
