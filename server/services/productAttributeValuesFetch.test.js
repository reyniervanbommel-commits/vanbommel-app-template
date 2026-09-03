'use strict';

const d365OData = require('./D365ODataService');
const tableRegistry = require('./TableRegistryService');
const { productAttributeValuesFetch } = require('./productAttributeValuesFetch');

const table = {
  key: 'product-attribute-values',
  sourceEntity: '/data/ProductAttributeValuesV3',
  maxRows: 10000,
  defaultFilter: '',
  id: 9,
};

function mockItemsCache(keys) {
  vi.spyOn(tableRegistry, 'getTableByKey').mockResolvedValue({ id: 3, key: 'items' });
  vi.spyOn(tableRegistry, 'getPool').mockResolvedValue({
    request: () => ({
      input() { return this; },
      query: async () => ({ recordset: keys.map((record_key) => ({ record_key })) }),
    }),
  });
}

describe('productAttributeValuesFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(d365OData, 'fetchEntityRecords').mockResolvedValue({
      items: [],
      truncated: false,
      pagesFetched: 1,
    });
  });

  it('doet geen D365-call als de items-cache leeg is', async () => {
    mockItemsCache([]);
    const result = await productAttributeValuesFetch(table);
    expect(d365OData.fetchEntityRecords).not.toHaveBeenCalled();
    expect(result).toEqual({ records: [], total: 0, truncated: false });
  });

  it('geeft genericMaster-recordvorm terug, niet raw D365-items', async () => {
    mockItemsCache(['SHOE-41']);
    d365OData.fetchEntityRecords.mockResolvedValue({
      items: [{ ProductNumber: 'SHOE-41', AttributeName: 'Season', AttributeValue: 'SS26' }],
      truncated: false,
      pagesFetched: 1,
    });
    const result = await productAttributeValuesFetch(table);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      partitionKey: 'shared',
      recordKey: 'SHOE-41|Season|SS26',
      masterRaw: { ProductNumber: 'SHOE-41', AttributeName: 'Season', AttributeValue: 'SS26' },
      master: {
        productNumber: 'SHOE-41',
        attributeName: 'Season',
        attributeValue: 'SS26',
        attributeTypeName: null,
        textValue: 'SS26',
      },
      details: [],
    });
  });

  it('zet TextValue in attributeValue als AttributeValue leeg is', async () => {
    mockItemsCache(['SHOE-41']);
    d365OData.fetchEntityRecords.mockResolvedValue({
      items: [{ ProductNumber: 'SHOE-41', AttributeName: 'Sole name', TextValue: 'Nova' }],
      truncated: false,
      pagesFetched: 1,
    });
    const result = await productAttributeValuesFetch(table);
    expect(result.records[0].recordKey).toBe('SHOE-41|Sole name|Nova');
    expect(result.records[0].master.attributeValue).toBe('Nova');
    expect(result.records[0].master.textValue).toBe('Nova');
  });

  it('AND-t ProductNumber-chunk altijd, ook mét admin-filter, company-filter uit', async () => {
    mockItemsCache(['SHOE-41']);
    await productAttributeValuesFetch({
      ...table,
      defaultFilter: JSON.stringify([{ field: 'AttributeName', operator: 'eq', value: 'Season', valueType: 'text', level: 'header' }]),
    });
    const arg = d365OData.fetchEntityRecords.mock.calls[0][0];
    expect(arg.applyCompanyFilter).toBe(false);
    expect(arg.extraFilter).toContain('ProductNumber eq');
    expect(arg.extraFilter).toContain('AttributeName');
    expect(arg.maxItems).toBe(10000);
  });

  it('stopt na 50 chunks en zet truncated + notice', async () => {
    mockItemsCache(Array.from({ length: 1001 }, (_, i) => `SKU-${i}`));
    const result = await productAttributeValuesFetch(table);
    expect(d365OData.fetchEntityRecords.mock.calls.length).toBe(50);
    expect(result.truncated).toBe(true);
    expect(result.noticeText).toMatch(/1000 item numbers/);
  });
});
