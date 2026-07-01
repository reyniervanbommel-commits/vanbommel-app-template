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
function buildShortlist(entities, prompt, { min = SHORTLIST_MIN, max = SHORTLIST_MAX } = {}) {
  const names = (Array.isArray(entities) ? entities : [])
    .map((e) => (typeof e === 'string' ? e : e && e.name))
    .filter((n) => typeof n === 'string' && n.length > 0);

  // Woorden uit de prompt: alfanumerieke tokens van >=3 tekens, lowercase, uniek.
  const words = Array.from(new Set(
    String(prompt || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3),
  ));

  const seen = new Set();
  const shortlist = [];

  // 1) Naam-matches op prompt-woorden (behoud de bron-volgorde = alfabetisch).
  if (words.length) {
    for (const name of names) {
      if (shortlist.length >= max) break;
      const lower = name.toLowerCase();
      if (words.some((w) => lower.includes(w)) && !seen.has(name)) {
        seen.add(name);
        shortlist.push(name);
      }
    }
  }

  // 2) Aanvullen met een alfabetische top tot `min` (of tot de lijst op is), zonder `max` te overschrijden.
  for (const name of names) {
    if (shortlist.length >= min || shortlist.length >= max) break;
    if (!seen.has(name)) {
      seen.add(name);
      shortlist.push(name);
    }
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

  // Valideer dat de voorgestelde entiteit echt bestaat; anders best-effort fuzzy match + waarschuwing.
  const matched = findEntityByName(allEntities, proposedEntitySet);
  const entitySet = matched ? matched.name : proposedEntitySet;
  const sourceEntity = '/data/' + entitySet;
  const warning = matched
    ? null
    : `De voorgestelde entiteit '${proposedEntitySet}' is niet exact in de bronlijst gevonden; controleer de keuze.`;

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

module.exports = {
  suggest,
  suggestRelation,
  createMessage,
  createRelationMessage,
  // Geëxporteerd voor unit-tests (DB-/netwerk-vrij):
  buildShortlist,
  findEntityByName,
  SHORTLIST_MIN,
  SHORTLIST_MAX,
};
