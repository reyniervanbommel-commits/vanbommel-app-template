'use strict';

// TableAssistService — AI-authoring-assistent voor de Table Builder (#139, build-time, admin-only).
// NIET in het datapad: dit helpt een admin bij het KIEZEN van de juiste D365-entiteit + relevante velden
// voor een nieuwe tabel. Gebruikt Claude via @anthropic-ai/sdk met tool-use voor gestructureerde output.
//
// Kostenbewaking: D365 $metadata bevat ~5163 EntitySets. We sturen die NOOIT allemaal naar het model
// (te veel tokens). We pre-filteren server-side tot een shortlist (~40-80 namen) op basis van de woorden
// in de prompt, aangevuld met een alfabetische top als er te weinig matches zijn.
//
// Geheimen: we loggen nooit de API-key of de volledige prompt — alleen lengtes/aantallen.

const Anthropic = require('@anthropic-ai/sdk');
const { logger } = require('../utils/logger');
const tableBuilder = require('./TableBuilderService');
const providerFactory = require('./sources/providerFactory');

const MODEL = 'claude-opus-4-8';
const MAX_TOKENS = 1024;
const SHORTLIST_MIN = 40;
const SHORTLIST_MAX = 80;
const TOOL_NAME = 'stel_tabel_voor';

const SYSTEM_PROMPT = [
  'Je bent een assistent die een beheerder (admin) helpt bij het opzetten van een tabel in een',
  'generieke Table Builder bovenop Dynamics 365 Finance & Operations (D365 F&O).',
  'Je krijgt een beschrijving van wat de admin nodig heeft plus een SHORTLIST van kandidaat-entiteiten',
  '(EntitySets uit de D365 OData-metadata). Kies de één best passende entiteit UIT DE SHORTLIST en stel',
  'de relevante velden voor (master- en detailniveau). Kies alleen velden die logisch bij het verzoek',
  'passen; verzin geen entiteiten of velden die niet plausibel bestaan. Antwoord uitsluitend via het',
  'tool "stel_tabel_voor". Labels en reden in het Nederlands.',
].join(' ');

const TOOL_DEF = {
  name: TOOL_NAME,
  description:
    'Stel de best passende D365-entiteit (entitySet) en de relevante velden voor de tabel voor. '
    + 'Kies entitySet uit de aangeleverde shortlist.',
  input_schema: {
    type: 'object',
    properties: {
      entitySet: { type: 'string', description: 'De gekozen EntitySet-naam uit de shortlist.' },
      reason: { type: 'string', description: 'Korte NL-onderbouwing van de keuze.' },
      fields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            scope: { type: 'string', enum: ['master', 'detail'] },
            field: { type: 'string' },
            label: { type: 'string' },
          },
          required: ['scope', 'field', 'label'],
        },
      },
    },
    required: ['entitySet', 'reason'],
  },
};

// ---------------------------------------------------------------------------
// Pure shortlist-prefilter (DB-/netwerk-vrij, geëxporteerd voor tests).
// Matcht de woorden uit de prompt tegen entity-namen (case-insensitive, deel-woord). Vult aan met een
// alfabetische top als er te weinig matches zijn, zodat het model altijd genoeg (maar niet te veel)
// kandidaten ziet. Nooit meer dan SHORTLIST_MAX namen.
// ---------------------------------------------------------------------------
// NL->EN domein-synoniemen: de UI is Nederlands, maar D365-entiteitsnamen zijn Engels. Zonder deze
// vertaling matcht een NL-prompt ("inkooporders", "leverancier") nooit op de Engelse namen en krijgt
// het model een nutteloze (alfabetische) shortlist. Elk NL-woord mapt op fragmenten die in de
// entiteitsnamen voorkomen. Uitbreidbaar; onbekende woorden vallen terug op letterlijke substring-match.
const TERM_SYNONYMS = {
  inkoop: ['purchase'], inkooporder: ['purchase', 'order'], inkooporders: ['purchase', 'order'],
  order: ['order'], orders: ['order'], orderregel: ['line'], orderregels: ['line'], regel: ['line'], regels: ['line'],
  leverancier: ['vendor'], leveranciers: ['vendor'], crediteur: ['vendor'], crediteuren: ['vendor'],
  klant: ['customer'], klanten: ['customer'], debiteur: ['customer'], debiteuren: ['customer'],
  verkoop: ['sales'], verkooporder: ['sales', 'order'], verkooporders: ['sales', 'order'],
  factuur: ['invoice'], facturen: ['invoice'],
  artikel: ['item', 'product'], artikelen: ['item', 'product'], product: ['product', 'item'], producten: ['product', 'item'],
  betaling: ['payment'], betalingen: ['payment'], grootboek: ['ledger'], rekening: ['account'],
  medewerker: ['worker', 'employee', 'personnel'], werknemer: ['worker', 'employee'], personeel: ['personnel', 'worker'],
  project: ['project'], projecten: ['project'], bedrijf: ['company', 'legalentity'],
  magazijn: ['warehouse'], voorraad: ['inventory'], prijs: ['price'], prijzen: ['price'],
  contract: ['agreement'], contracten: ['agreement'], levering: ['delivery'], leverdatum: ['delivery', 'date'],
  datum: ['date'], bedrag: ['amount'], hoeveelheid: ['quantity'], aantal: ['quantity'],
  bank: ['bank'], adres: ['address'], adressen: ['address'],
};

// Bouwt de zoektermen uit de prompt: elk woord (>=3 tekens) zelf + eventuele NL->EN-synoniemen.
function promptSearchTerms(prompt) {
  const words = String(prompt || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  const terms = new Set();
  for (const w of words) {
    terms.add(w);
    for (const syn of (TERM_SYNONYMS[w] || [])) terms.add(syn);
  }
  return Array.from(terms);
}

function buildShortlist(entities, prompt, { min = SHORTLIST_MIN, max = SHORTLIST_MAX } = {}) {
  const names = (Array.isArray(entities) ? entities : [])
    .map((e) => (typeof e === 'string' ? e : e && e.name))
    .filter((n) => typeof n === 'string' && n.length > 0);

  const terms = promptSearchTerms(prompt);

  // 1) Score elke naam op het AANTAL distinct matchende zoektermen. Namen die meer concept-woorden
  // dekken (bv. "PurchaseOrderHeadersV2" = purchase + order) scoren hoger en komen bovenaan, zodat de
  // kernentiteit binnen de cap valt i.p.v. weggeknipt te worden door alfabetisch vroege naamgenoten.
  const scored = [];
  if (terms.length) {
    for (const name of names) {
      const lower = name.toLowerCase();
      let score = 0;
      for (const t of terms) if (lower.includes(t)) score += 1;
      if (score > 0) scored.push({ name, score });
    }
    // Bij gelijke score: geef de voorkeur aan de canonieke entiteit. CDS*-namen zijn Common-Data-Service-
    // integratie-entiteiten (zelden wat een beheerder wil); V2/V3-varianten zijn meestal de actuele.
    const canonicalRank = (name) => (/^CDS/i.test(name) ? 3 : 0) + (/V\d+$/.test(name) ? -1 : 0);
    scored.sort((a, b) =>
      (b.score - a.score)
      || (canonicalRank(a.name) - canonicalRank(b.name))
      || a.name.localeCompare(b.name));
  }

  const seen = new Set();
  const shortlist = [];
  for (const { name } of scored) {
    if (shortlist.length >= max) break;
    if (!seen.has(name)) { seen.add(name); shortlist.push(name); }
  }

  // 2) Aanvullen met een alfabetische top tot `min` (alleen als er te weinig matches waren).
  for (const name of names) {
    if (shortlist.length >= min || shortlist.length >= max) break;
    if (!seen.has(name)) { seen.add(name); shortlist.push(name); }
  }

  return shortlist.slice(0, max);
}

// Best-effort fuzzy match als het model een entitySet noemt die niet exact in de lijst staat.
function findEntityByName(entities, wanted) {
  const target = String(wanted || '').trim().toLowerCase();
  if (!target) return null;
  const list = Array.isArray(entities) ? entities : [];
  const exact = list.find((e) => String(e.name || '').toLowerCase() === target);
  if (exact) return exact;
  return list.find((e) => String(e.name || '').toLowerCase().includes(target)) || null;
}

// Haal de VOLLEDIGE (ongecapte) entiteitenlijst van een bron op, via de provider direct. Zo kan de
// shortlist-prefilter over alle entiteiten matchen zonder de 200-cap van TableBuilderService.discoverEntities.
async function resolveAllEntities(sourceId) {
  const source = await tableBuilder.getSource(sourceId);
  if (!source) throw Object.assign(new Error('Bron niet gevonden'), { status: 404 });
  const provider = providerFactory.getProvider(source.providerType);
  const caps = provider.capabilities();
  if (!caps.discoverEntities) {
    throw Object.assign(new Error('Deze bron ondersteunt geen entiteit-discovery'), { status: 501 });
  }
  const entities = await provider.discoverEntities();
  return Array.isArray(entities) ? entities : [];
}

function requireApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error('AI-assistent niet geconfigureerd (ANTHROPIC_API_KEY ontbreekt)'),
      { status: 503, code: 'AI_NOT_CONFIGURED' },
    );
  }
  return apiKey;
}

// Dunne wrapper rond de SDK-call. Apart zodat unit-tests deze kunnen mocken zonder de echte
// @anthropic-ai/sdk te instantiëren (vi.spyOn op de export). Bevat de tool-use-configuratie.
async function createMessage({ apiKey, userContent }) {
  const client = new Anthropic({ apiKey });
  return client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
    tools: [TOOL_DEF],
    tool_choice: { type: 'tool', name: TOOL_NAME },
  });
}

// ---------------------------------------------------------------------------
// Relatie-suggestie (§3): Claude kiest de logische "detail/regels"-NavigationProperty.
// ---------------------------------------------------------------------------
const RELATION_TOOL_NAME = 'stel_relatie_voor';

const RELATION_SYSTEM_PROMPT = [
  'Je bent een assistent die een beheerder helpt bij het leggen van een master-detail-relatie in een',
  'generieke Table Builder bovenop Dynamics 365 Finance & Operations. Je krijgt de master-entiteit en de',
  'lijst NavigationProperties (relatie-kandidaten) van die entiteit. Kies de NavigationProperty die de',
  'logische "detail/regels"-relatie vertegenwoordigt (bv. de orderregels bij een order). Geef alleen een',
  'NavigationProperty die in de aangeleverde lijst staat; verzin er geen. Antwoord uitsluitend via het',
  'tool "stel_relatie_voor". Reden in het Nederlands.',
].join(' ');

const RELATION_TOOL_DEF = {
  name: RELATION_TOOL_NAME,
  description:
    'Kies de NavigationProperty die de logische detail/regels-relatie is en benoem de detail-sleutelvelden. '
    + 'Kies navigationProperty uit de aangeleverde lijst.',
  input_schema: {
    type: 'object',
    properties: {
      navigationProperty: { type: 'string', description: 'De gekozen NavigationProperty-naam uit de lijst.' },
      detailKeyFields: {
        type: 'array',
        items: { type: 'string' },
        description: 'De sleutelvelden van de detail-entiteit (bv. LineNumber).',
      },
      reason: { type: 'string', description: 'Korte NL-onderbouwing van de keuze.' },
    },
    required: ['navigationProperty', 'reason'],
  },
};

// Dunne SDK-wrapper voor de relatie-suggestie (apart van createMessage zodat tests deze los kunnen mocken).
async function createRelationMessage({ apiKey, userContent }) {
  const client = new Anthropic({ apiKey });
  return client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: RELATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
    tools: [RELATION_TOOL_DEF],
    tool_choice: { type: 'tool', name: RELATION_TOOL_NAME },
  });
}

// suggestRelation — laat Claude de logische detail-relatie van een tabel voorstellen. Haalt de master +
// nav-properties op via TableBuilderService.discoverRelations (klein, dus geen shortlist nodig).
async function suggestRelation({ tableId }) {
  const apiKey = requireApiKey();

  const { relations } = await tableBuilder.discoverRelations(tableId);
  const candidates = Array.isArray(relations) ? relations : [];
  if (!candidates.length) {
    throw Object.assign(new Error('Geen relatie-kandidaten gevonden voor deze entiteit'), { status: 404 });
  }

  const table = await tableBuilder.getTable(tableId);
  const lines = candidates.map(
    (r) => `- ${r.name} -> ${r.targetEntityType}${r.isCollection ? ' (collectie: master→N-detail)' : ''}`,
  );
  const userContent = [
    `Master-entiteit: ${table.sourceEntity}`,
    '',
    'NavigationProperties (relatie-kandidaten):',
    lines.join('\n'),
    '',
    'Kies de NavigationProperty die de detail/regels-relatie is en benoem de detail-sleutelvelden.',
  ].join('\n');

  logger.info('Table Builder AI-assist: relatie-suggestie', {
    tableId, kandidaten: candidates.length,
  });

  // Via module.exports zodat een test-spy op createRelationMessage effect heeft.
  const response = await module.exports.createRelationMessage({ apiKey, userContent });

  const content = Array.isArray(response && response.content) ? response.content : [];
  const toolUse = content.find((c) => c && c.type === 'tool_use');
  if (!toolUse || !toolUse.input) {
    throw Object.assign(new Error('AI-assistent gaf geen bruikbaar relatie-voorstel terug'), { status: 502 });
  }

  const input = toolUse.input;
  const proposed = String(input.navigationProperty || '').trim();
  // Valideer dat de gekozen nav-property echt bestaat (exact, dan case-insensitive).
  const matched = candidates.find((r) => r.name === proposed)
    || candidates.find((r) => r.name.toLowerCase() === proposed.toLowerCase());
  const detailSourceEntity = matched ? matched.name : proposed;
  const detailKeyFields = Array.isArray(input.detailKeyFields)
    ? input.detailKeyFields.map((f) => String(f || '').trim()).filter(Boolean)
    : [];
  const warning = matched
    ? undefined
    : `De voorgestelde relatie '${proposed}' staat niet in de kandidatenlijst; controleer de keuze.`;

  return {
    ok: true,
    suggestion: {
      detailSourceEntity,
      kind: 'expand',
      detailKeyFields,
      reason: String(input.reason || '').trim(),
      ...(warning ? { warning } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// suggest — vraag Claude een entiteit + velden voor te stellen op basis van de admin-prompt.
// ---------------------------------------------------------------------------
async function suggest({ sourceId, prompt }) {
  const apiKey = requireApiKey();

  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw Object.assign(new Error('Geef een omschrijving op'), { status: 400 });

  // Volledige entiteitenlijst ophalen (ongefilterd) om de shortlist server-side op te bouwen. Bewust
  // NIET via de capped discoverEntities-service maar direct via de provider, zodat prompt-woord-matches
  // over ALLE ~5163 entiteiten kunnen worden gevonden — de shortlist zelf begrenst daarna de tokenkost.
  const allEntities = await resolveAllEntities(sourceId);

  const shortlistNames = buildShortlist(allEntities, cleanPrompt);
  logger.info('Table Builder AI-assist: shortlist opgebouwd', {
    sourceId,
    promptLength: cleanPrompt.length,
    totalEntities: allEntities.length,
    shortlistSize: shortlistNames.length,
  });

  const userContent = [
    'Verzoek van de admin:',
    cleanPrompt,
    '',
    'SHORTLIST van kandidaat-entiteiten (kies entitySet hieruit):',
    shortlistNames.join('\n'),
  ].join('\n');

  // Via module.exports zodat een test-spy op createMessage effect heeft.
  const response = await module.exports.createMessage({ apiKey, userContent });

  const content = Array.isArray(response && response.content) ? response.content : [];
  const toolUse = content.find((c) => c && c.type === 'tool_use');
  if (!toolUse || !toolUse.input) {
    throw Object.assign(new Error('AI-assistent gaf geen bruikbaar voorstel terug'), { status: 502 });
  }

  const input = toolUse.input;
  const proposedEntitySet = String(input.entitySet || '').trim();
  const fields = Array.isArray(input.fields) ? input.fields : [];

  // Valideer dat de voorgestelde entiteit echt bestaat. Zo niet: geef GEEN /data/<garbage> terug
  // (dat zou een kapotte tabel opleveren) — entitySet/sourceEntity worden null en de frontend toont
  // de waarschuwing i.p.v. iets voor te vullen. Het model gebruikt '<UNKNOWN>' als het niets passends
  // in de shortlist vindt; die weigering vertalen we naar een duidelijke, niet-invulbare suggestie.
  const matched = findEntityByName(allEntities, proposedEntitySet);
  const entitySet = matched ? matched.name : null;
  const sourceEntity = matched ? '/data/' + matched.name : null;
  const warning = matched
    ? null
    : 'De AI kon geen passende entiteit in de bron bepalen. Verfijn je omschrijving of kies handmatig via de picker.';

  return {
    ok: true,
    suggestion: {
      entitySet,
      sourceEntity,
      reason: String(input.reason || '').trim(),
      fields,
      ...(warning ? { warning } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Filter-assistent (§filter): Claude vertaalt een NL-omschrijving naar filterclausules op de bekende
// velden. WIJ bouwen de OData-$filter deterministisch uit GEVALIDEERDE clausules — nooit een vrije
// modelstring — zodat er geen ongeldige of geïnjecteerde OData in de tabel-config belandt.
// ---------------------------------------------------------------------------
const FILTER_TOOL_NAME = 'stel_filter_voor';
const FILTER_ENUM_CAP = 50; // Max. aantal keuzelijst-waarden per veld in de context (tokenbewaking).

const FILTER_SYSTEM_PROMPT = [
  'Je bent een assistent die een beheerder helpt een STANDAARDFILTER op te stellen voor een tabel bovenop',
  'Dynamics 365 Finance & Operations. Je krijgt de omschrijving van de admin plus de lijst FILTERBARE',
  'VELDEN van de entiteit (met datatype, toegestane operatoren en, voor keuzelijst-velden, de toegestane',
  'waarden). Vertaal de omschrijving naar één of meer filterclausules. Gebruik UITSLUITEND velden,',
  'operatoren en (voor keuzelijsten) waarden uit de aangeleverde lijst; verzin niets. Voor keuzelijst-',
  'velden geef je de waarde-NAAM (bv. "Backorder"), niet de volledige OData-literal. Antwoord uitsluitend',
  'via het tool "stel_filter_voor". Reden in het Nederlands.',
].join(' ');

const FILTER_TOOL_DEF = {
  name: FILTER_TOOL_NAME,
  description:
    'Stel filterclausules voor op basis van de omschrijving. Gebruik alleen velden, operatoren en '
    + '(voor keuzelijsten) waarden uit de aangeleverde lijst.',
  input_schema: {
    type: 'object',
    properties: {
      clauses: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'Veldnaam uit de lijst.' },
            operator: { type: 'string', description: 'Operator uit de toegestane lijst van dat veld (eq, ne, gt, ge, lt, le, contains, startswith).' },
            value: { type: 'string', description: 'De waarde. Voor keuzelijst-velden: de waarde-naam uit de lijst.' },
            join: { type: 'string', enum: ['and', 'or'], description: 'Verbinding met de VORIGE clausule (genegeerd voor de eerste).' },
          },
          required: ['field', 'operator', 'value'],
        },
      },
      reason: { type: 'string', description: 'Korte NL-onderbouwing.' },
    },
    required: ['clauses', 'reason'],
  },
};

// Dunne SDK-wrapper voor de filter-suggestie (apart zodat tests deze los kunnen mocken).
async function createFilterMessage({ apiKey, userContent }) {
  const client = new Anthropic({ apiKey });
  return client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: FILTER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
    tools: [FILTER_TOOL_DEF],
    tool_choice: { type: 'tool', name: FILTER_TOOL_NAME },
  });
}

// OData-string-literal escapen (enkele quote verdubbelen).
function escapeODataString(v) {
  return String(v == null ? '' : v).replace(/'/g, "''");
}

// Bouw de OData-expressie voor één clausule tegen een bekend veld-metaobject (uit discoverFilterFields).
// Retourneert null als operator/waarde niet op het veld passen — zo valt ongeldige input er hard uit.
function buildClauseExpression(field, operator, rawValue) {
  const op = String(operator || '').trim();
  if (!Array.isArray(field.operators) || !field.operators.includes(op)) return null;
  const val = rawValue == null ? '' : String(rawValue).trim();

  if (field.dataType === 'select') {
    const members = Array.isArray(field.enumMembers) ? field.enumMembers : [];
    const member = members.find((m) => m.name.toLowerCase() === val.toLowerCase() || m.value === val);
    if (!member) return null;
    return `${field.field} ${op} ${member.value}`;
  }
  if (field.dataType === 'boolean') {
    const b = /^(true|1|ja|yes)$/i.test(val) ? 'true' : /^(false|0|nee|no)$/i.test(val) ? 'false' : null;
    if (b === null) return null;
    return `${field.field} ${op} ${b}`;
  }
  if (field.dataType === 'number') {
    if (!/^-?\d+(\.\d+)?$/.test(val)) return null;
    return `${field.field} ${op} ${val}`;
  }
  if (field.dataType === 'date') {
    let dt = val;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) dt = dt + 'T00:00:00Z'; // alleen datum -> DateTimeOffset.
    if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+/.test(dt)) return null;
    return `${field.field} ${op} ${dt}`;
  }
  // text
  if (op === 'contains' || op === 'startswith') {
    return `${op}(${field.field},'${escapeODataString(val)}')`;
  }
  return `${field.field} ${op} '${escapeODataString(val)}'`;
}

// Valideer de voorgestelde clausules tegen de bekende velden en bouw de OData-$filter. Retourneert de
// GELDIGE clausules (voor de UI-builder), de samengestelde `filter`-string en het aantal `dropped`.
function buildFilterFromClauses(rawClauses, fields) {
  const byName = new Map((Array.isArray(fields) ? fields : []).map((f) => [f.field.toLowerCase(), f]));
  const clauses = [];
  const expressions = [];
  let dropped = 0;
  for (const c of (Array.isArray(rawClauses) ? rawClauses : [])) {
    const field = byName.get(String((c && c.field) || '').toLowerCase());
    if (!field) { dropped += 1; continue; }
    const expr = buildClauseExpression(field, c.operator, c.value);
    if (!expr) { dropped += 1; continue; }
    const join = expressions.length === 0 ? null : (c.join === 'or' ? 'or' : 'and');
    clauses.push({ field: field.field, operator: String(c.operator).trim(), value: String(c.value ?? ''), join });
    expressions.push(join ? `${join} ${expr}` : expr);
  }
  return { clauses, filter: expressions.join(' '), dropped };
}

// suggestFilter — Claude vertaalt een NL-omschrijving naar een OData-$filter op de gekozen entiteit. Werkt
// op sourceId + sourceEntity zodat het bij aanmaken én bewerken bruikbaar is.
async function suggestFilter({ sourceId, sourceEntity, prompt }) {
  const apiKey = requireApiKey();

  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw Object.assign(new Error('Geef een omschrijving op'), { status: 400 });
  const entity = String(sourceEntity || '').trim();
  if (!entity) throw Object.assign(new Error('Geen entiteit opgegeven'), { status: 400 });

  const { fields } = await tableBuilder.discoverFilterFields(sourceId, entity);
  if (!Array.isArray(fields) || !fields.length) {
    throw Object.assign(new Error('Geen filterbare velden gevonden voor deze entiteit'), { status: 404 });
  }

  // Bied de AI bij voorkeur alleen velden mét data aan (lege kolommen zijn zelden nuttig om op te filteren);
  // val terug op alle velden als de sampling niets opleverde (bv. sample-fetch mislukt).
  const withData = fields.filter((f) => Array.isArray(f.samples) && f.samples.length > 0);
  const contextFields = withData.length ? withData : fields;

  // Compacte context: veldnaam, datatype, operatoren en (voor keuzelijsten) de ledennamen (gecapt).
  const fieldLines = contextFields.map((f) => {
    const base = `- ${f.field} (${f.dataType}; ops: ${(f.operators || []).join('/')})`;
    if (f.dataType === 'select' && Array.isArray(f.enumMembers) && f.enumMembers.length) {
      const names = f.enumMembers.slice(0, FILTER_ENUM_CAP).map((m) => m.name).join(', ');
      return `${base} waarden: ${names}`;
    }
    return base;
  });

  const userContent = [
    'Verzoek van de admin:',
    cleanPrompt,
    '',
    `Entiteit: ${entity}`,
    '',
    'FILTERBARE VELDEN (gebruik alleen deze):',
    fieldLines.join('\n'),
  ].join('\n');

  logger.info('Table Builder AI-assist: filter-suggestie', {
    sourceId, entity, promptLength: cleanPrompt.length, fieldCount: fields.length,
  });

  // Via module.exports zodat een test-spy op createFilterMessage effect heeft.
  const response = await module.exports.createFilterMessage({ apiKey, userContent });

  const content = Array.isArray(response && response.content) ? response.content : [];
  const toolUse = content.find((c) => c && c.type === 'tool_use');
  if (!toolUse || !toolUse.input) {
    throw Object.assign(new Error('AI-assistent gaf geen bruikbaar filter terug'), { status: 502 });
  }

  const { clauses, filter, dropped } = buildFilterFromClauses(toolUse.input.clauses, fields);
  const warning = !clauses.length
    ? 'De AI kon geen geldig filter samenstellen uit je omschrijving. Verfijn de omschrijving of stel het filter handmatig samen.'
    : dropped > 0
      ? `${dropped} voorgestelde clausule(s) zijn overgeslagen omdat ze niet op een bekend veld, operator of waarde pasten.`
      : undefined;

  return {
    ok: true,
    suggestion: {
      filter,
      clauses,
      reason: String(toolUse.input.reason || '').trim(),
      ...(warning ? { warning } : {}),
    },
  };
}

module.exports = {
  suggest,
  suggestRelation,
  suggestFilter,
  createMessage,
  createRelationMessage,
  createFilterMessage,
  // Geëxporteerd voor unit-tests (DB-/netwerk-vrij):
  buildShortlist,
  findEntityByName,
  buildClauseExpression,
  buildFilterFromClauses,
  SHORTLIST_MIN,
  SHORTLIST_MAX,
};
