'use strict';

// DB-/netwerk-/SDK-vrije unit-tests voor de AI-authoring-assistent (#139):
//  (a) de pure shortlist-prefilter (begrenst de ~5163-entiteiten-tokenkost),
//  (b) suggest() met een gemockte @anthropic-ai/sdk: geeft de tool_use-input correct terug,
//  (c) ontbrekende ANTHROPIC_API_KEY -> 503 met code AI_NOT_CONFIGURED.
//
// De DB-/provider-/SDK-afhankelijkheden mocken we met vi.spyOn op de echte module-objecten
// (betrouwbaarder dan vi.mock voor CJS-require in deze setup). De SDK-call zit achter de
// exporteerde wrapper createMessage, die we spyen zodat @anthropic-ai/sdk nooit echt draait.

// vi/describe/it/expect zijn globaal (vitest.config: globals:true).

const tableBuilder = require('./TableBuilderService');
const providerFactory = require('./sources/providerFactory');
const assist = require('./TableAssistService');
const { suggest, suggestRelation, buildShortlist, findEntityByName } = assist;

// Staat voor de gemockte SDK-respons; per test overschreven.
const createMock = vi.fn();
const relationMock = vi.fn();

const ENTITIES = [
  { name: 'CustomersV3', sourceEntity: '/data/CustomersV3', entityType: 'x.CustomerV3' },
  { name: 'PurchaseOrderHeadersV2', sourceEntity: '/data/PurchaseOrderHeadersV2', entityType: 'x.PurchaseOrderHeaderV2' },
  { name: 'PurchaseOrderLinesV2', sourceEntity: '/data/PurchaseOrderLinesV2', entityType: 'x.PurchaseOrderLineV2' },
  { name: 'VendorsV2', sourceEntity: '/data/VendorsV2', entityType: 'x.VendorV2' },
];

const providerStub = {
  capabilities: () => ({ discoverEntities: true }),
  discoverEntities: vi.fn(),
};

beforeEach(() => {
  createMock.mockReset();
  relationMock.mockReset();
  providerStub.discoverEntities.mockReset();
  vi.restoreAllMocks();
  delete process.env.ANTHROPIC_API_KEY;
});

const RELATION_CANDIDATES = [
  { name: 'PurchaseOrderLines', targetEntityType: 'PurchaseOrderLineV2', isCollection: true },
  { name: 'Vendor', targetEntityType: 'VendorV2', isCollection: false },
];

describe('buildShortlist — begrenst de entiteiten-tokenkost', () => {
  it('matcht prompt-woorden op entity-namen (case-insensitive, deel-woord)', () => {
    const list = buildShortlist(ENTITIES, 'ik wil een tabel met purchase order regels', { min: 2, max: 10 });
    expect(list).toContain('PurchaseOrderHeadersV2');
    expect(list).toContain('PurchaseOrderLinesV2');
  });

  it('vult aan tot het minimum met een alfabetische top als er te weinig matches zijn', () => {
    const list = buildShortlist(ENTITIES, 'zzz geen match', { min: 3, max: 10 });
    expect(list.length).toBe(3);
  });

  it('overschrijdt nooit het maximum (kostenplafond)', () => {
    const many = Array.from({ length: 5163 }, (_, i) => ({ name: `Entity${i}` }));
    const list = buildShortlist(many, 'entity', { min: 40, max: 80 });
    expect(list.length).toBeLessThanOrEqual(80);
  });

  it('accepteert zowel string- als object-entiteiten', () => {
    const list = buildShortlist(['Alpha', 'Beta'], 'alpha', { min: 1, max: 5 });
    expect(list).toContain('Alpha');
  });
});

describe('findEntityByName', () => {
  it('matcht exact (case-insensitive)', () => {
    expect(findEntityByName(ENTITIES, 'vendorsv2').name).toBe('VendorsV2');
  });
  it('valt terug op substring-match', () => {
    expect(findEntityByName(ENTITIES, 'PurchaseOrderHeaders').name).toBe('PurchaseOrderHeadersV2');
  });
  it('geeft null bij geen match', () => {
    expect(findEntityByName(ENTITIES, 'bestaatniet')).toBeNull();
  });
});

describe('suggest — ontbrekende API-key', () => {
  it('gooit 503 met code AI_NOT_CONFIGURED als ANTHROPIC_API_KEY ontbreekt', async () => {
    await expect(suggest({ sourceId: 1, prompt: 'iets' })).rejects.toMatchObject({
      status: 503,
      code: 'AI_NOT_CONFIGURED',
    });
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('suggest — met gemockte SDK', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.spyOn(tableBuilder, 'getSource').mockResolvedValue({ id: 1, providerType: 'd365_odata' });
    vi.spyOn(providerFactory, 'getProvider').mockReturnValue(providerStub);
    providerStub.discoverEntities.mockResolvedValue(ENTITIES);
    // De echte SDK-wrapper vervangen door de mock-respons; @anthropic-ai/sdk draait dus nooit.
    vi.spyOn(assist, 'createMessage').mockImplementation((...a) => createMock(...a));
  });

  it('geeft de tool_use-input correct terug als suggestion', async () => {
    createMock.mockResolvedValue({
      content: [
        { type: 'text', text: 'even nadenken' },
        {
          type: 'tool_use',
          name: 'stel_tabel_voor',
          input: {
            entitySet: 'PurchaseOrderHeadersV2',
            reason: 'Past bij inkooporders',
            fields: [{ scope: 'master', field: 'PurchaseOrderNumber', label: 'Ordernummer' }],
          },
        },
      ],
    });

    const result = await suggest({ sourceId: 1, prompt: 'inkooporders tabel' });
    expect(result.ok).toBe(true);
    expect(result.suggestion).toMatchObject({
      entitySet: 'PurchaseOrderHeadersV2',
      sourceEntity: '/data/PurchaseOrderHeadersV2',
      reason: 'Past bij inkooporders',
    });
    expect(result.suggestion.fields).toHaveLength(1);
    expect(result.suggestion.warning).toBeUndefined();
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('geeft geen ongeldige entitySet terug als de voorgestelde entiteit niet in de bronlijst staat', async () => {
    createMock.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'stel_tabel_voor', input: { entitySet: 'OnbekendeEntiteit', reason: 'gok' } }],
    });
    const result = await suggest({ sourceId: 1, prompt: 'iets vaags' });
    // Geen match -> entitySet/sourceEntity null (geen /data/<garbage>) + een waarschuwing.
    expect(result.suggestion.entitySet).toBeNull();
    expect(result.suggestion.sourceEntity).toBeNull();
    expect(result.suggestion.warning).toBeTruthy();
  });

  it('gooit 502 als het model geen tool_use teruggeeft', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'geen tool' }] });
    await expect(suggest({ sourceId: 1, prompt: 'iets' })).rejects.toMatchObject({ status: 502 });
  });
});

describe('suggestRelation — ontbrekende API-key', () => {
  it('gooit 503 met code AI_NOT_CONFIGURED als ANTHROPIC_API_KEY ontbreekt', async () => {
    await expect(suggestRelation({ tableId: 1 })).rejects.toMatchObject({
      status: 503,
      code: 'AI_NOT_CONFIGURED',
    });
    expect(relationMock).not.toHaveBeenCalled();
  });
});

describe('suggestRelation — met gemockte SDK', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.spyOn(tableBuilder, 'discoverRelations').mockResolvedValue({ relations: RELATION_CANDIDATES });
    vi.spyOn(tableBuilder, 'getTable').mockResolvedValue({ id: 1, sourceEntity: '/data/PurchaseOrderHeadersV2' });
    vi.spyOn(assist, 'createRelationMessage').mockImplementation((...a) => relationMock(...a));
  });

  it('geeft de gekozen NavigationProperty terug als expand-relatie', async () => {
    relationMock.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'stel_relatie_voor',
          input: {
            navigationProperty: 'PurchaseOrderLines',
            detailKeyFields: ['LineNumber'],
            reason: 'De orderregels bij de order',
          },
        },
      ],
    });

    const result = await suggestRelation({ tableId: 1 });
    expect(result.ok).toBe(true);
    expect(result.suggestion).toMatchObject({
      detailSourceEntity: 'PurchaseOrderLines',
      kind: 'expand',
      detailKeyFields: ['LineNumber'],
    });
    expect(result.suggestion.warning).toBeUndefined();
    expect(relationMock).toHaveBeenCalledTimes(1);
  });

  it('voegt een waarschuwing toe als de voorgestelde nav-property niet in de lijst staat', async () => {
    relationMock.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'stel_relatie_voor', input: { navigationProperty: 'Onbekend', reason: 'gok' } }],
    });
    const result = await suggestRelation({ tableId: 1 });
    expect(result.suggestion.detailSourceEntity).toBe('Onbekend');
    expect(result.suggestion.warning).toContain('Onbekend');
  });

  it('gooit 404 als er geen relatie-kandidaten zijn', async () => {
    tableBuilder.discoverRelations.mockResolvedValue({ relations: [] });
    await expect(suggestRelation({ tableId: 1 })).rejects.toMatchObject({ status: 404 });
    expect(relationMock).not.toHaveBeenCalled();
  });

  it('gooit 502 als het model geen tool_use teruggeeft', async () => {
    relationMock.mockResolvedValue({ content: [{ type: 'text', text: 'geen tool' }] });
    await expect(suggestRelation({ tableId: 1 })).rejects.toMatchObject({ status: 502 });
  });
});
