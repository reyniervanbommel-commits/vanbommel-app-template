'use strict';

const {
  computeContentHash,
  computeChangedFieldKeys,
  buildHistoryByCell,
  dedupeDetailRows,
  addLookupColumnsByScope,
  applyLookups,
  normalizeExclusionRows,
  resolveConfiguredMaxItems,
  requiredMasterFieldsFromTable,
  compileMasterFormulaColumns,
  applyFormulaColumnsToRowValues,
  resolveSourceColumnValue,
  calculateLinkedLineTotal,
  applyRuntimeLinkedHeaderValues,
  assertCustomColumnWritable,
  buildLookupFieldMap,
  resolveLookupSourceKey,
  resolveLookupTargetSourceField,
  resolveLookupProjectionColumns,
  buildLookupDedupeSignature,
  buildLookupTargetAliases,
  FETCH_ADAPTERS,
} = require('./TableDataService');

describe('TableDataService.computeContentHash', () => {
  const masterJson = JSON.stringify({ vendorAccount: 'Q000104', status: 'Open' });
  const detail1 = JSON.stringify({ lineNumber: 1, itemNumber: 'ART-1', quantity: 10 });
  const detail2 = JSON.stringify({ lineNumber: 2, itemNumber: 'ART-2', quantity: 5 });

  it('is deterministisch voor dezelfde inhoud', () => {
    expect(computeContentHash(masterJson, [detail1])).toBe(computeContentHash(masterJson, [detail1]));
  });

  it('is onafhankelijk van de detail-volgorde', () => {
    expect(computeContentHash(masterJson, [detail1, detail2]))
      .toBe(computeContentHash(masterJson, [detail2, detail1]));
  });

  it('wijzigt wanneer een masterveld verandert', () => {
    const changed = JSON.stringify({ vendorAccount: 'Q000104', status: 'Confirmed' });
    expect(computeContentHash(changed, [detail1])).not.toBe(computeContentHash(masterJson, [detail1]));
  });

  it('wijzigt wanneer een detail verandert', () => {
    const changedDetail = JSON.stringify({ lineNumber: 1, itemNumber: 'ART-1', quantity: 11 });
    expect(computeContentHash(masterJson, [changedDetail])).not.toBe(computeContentHash(masterJson, [detail1]));
  });

  it('werkt zonder details', () => {
    expect(typeof computeContentHash(masterJson, [])).toBe('string');
  });
});

describe('TableDataService.computeChangedFieldKeys', () => {
  it('detecteert gewijzigde velden op sleutelnaam', () => {
    expect(computeChangedFieldKeys(
      { status: 'Open', quantity: 10 },
      { status: 'Confirmed', quantity: 10 }
    )).toEqual(['status']);
  });

  it('normaliseert lege/whitespace strings zodat false positives wegblijven', () => {
    expect(computeChangedFieldKeys(
      { comment: '   ' },
      { comment: null }
    )).toEqual([]);
  });

  it('detecteert toegevoegde en verwijderde keys', () => {
    expect(computeChangedFieldKeys(
      { oldField: 'A' },
      { newField: 'B' }
    )).toEqual(['newField', 'oldField']);
  });
});

describe('TableDataService.dedupeDetailRows', () => {
  it('dedupliceert detailregels op partition + record + detail', () => {
    const result = dedupeDetailRows([
      { partitionKey: 'whsl', recordKey: 'WSPO-1', detailKey: 10, dataJson: '{"line":10}' },
      { partitionKey: 'whsl', recordKey: 'WSPO-1', detailKey: 10, dataJson: '{"line":10b}' },
      { partitionKey: 'whsl', recordKey: 'WSPO-1', detailKey: 20, dataJson: '{"line":20}' },
    ]);
    expect(result.duplicateCount).toBe(1);
    expect(result.rows).toEqual([
      { partitionKey: 'whsl', recordKey: 'WSPO-1', detailKey: 10, dataJson: '{"line":10b}' },
      { partitionKey: 'whsl', recordKey: 'WSPO-1', detailKey: 20, dataJson: '{"line":20}' },
    ]);
  });
});

describe('TableDataService.buildHistoryByCell', () => {
  it('groepeert custom- en write-backhistorie per cel en kolom', () => {
    const result = buildHistoryByCell([
      { column_id: 11, partition_key: 'whsl', record_key: 'PO-1', detail_key: -1 },
      { column_id: 12, partition_key: 'whsl', record_key: 'PO-1', detail_key: -1 },
      { column_id: 21, partition_key: 'whsl', record_key: 'PO-1', detail_key: 10 },
    ]);

    expect(result.get(JSON.stringify(['whsl', 'PO-1', -1]))).toEqual({ 11: true, 12: true });
    expect(result.get(JSON.stringify(['whsl', 'PO-1', 10]))).toEqual({ 21: true });
  });

  it('geeft een lege index voor ongeldige invoer', () => {
    expect(buildHistoryByCell(null).size).toBe(0);
  });
});

describe('TableDataService.applyLookups (fk_join-verrijking #AB:162)', () => {
  const vendorLookup = {
    sourceScope: 'master',
    sourceField: 'vendorAccount',
    fieldEntries: [['vendorOrgName', 'vendorName']],
    partitionless: false,
    byKey: new Map([['whsl|Q000101', { vendorName: 'Negende Generatie Beheer BV' }]]),
  };

  it('verrijkt op partition|record_key (bron-lookup)', () => {
    const v = { vendorAccount: 'Q000101' };
    applyLookups(v, 'whsl', [vendorLookup], 'master');
    expect(v.vendorOrgName).toBe('Negende Generatie Beheer BV');
  });

  it('respecteert de partition (andere dataAreaId => geen match)', () => {
    const v = { vendorAccount: 'Q000101' };
    applyLookups(v, 'anders', [vendorLookup], 'master');
    expect(v.vendorOrgName).toBeNull();
  });

  // Excel-dataset: partitie-loze match op alleen record_key.
  const excelLookup = {
    sourceScope: 'detail',
    sourceField: 'itemNumber',
    fieldEntries: [['artikelKleur', 'kleur']],
    partitionless: true,
    byKey: new Map([['ART-1', { kleur: 'Zwart' }]]),
  };

  it('matcht partitie-loos op record_key ongeacht de partition', () => {
    const a = { itemNumber: 'ART-1' };
    applyLookups(a, 'whsl', [excelLookup], 'detail');
    expect(a.artikelKleur).toBe('Zwart');
    const b = { itemNumber: 'ART-1' };
    applyLookups(b, 'andere-company', [excelLookup], 'detail');
    expect(b.artikelKleur).toBe('Zwart');
  });

  it('geeft null bij een onbekende sleutel', () => {
    const v = { itemNumber: 'ART-9' };
    applyLookups(v, 'whsl', [excelLookup], 'detail');
    expect(v.artikelKleur).toBeNull();
  });

  it('valt terug op source-json wanneer de lookup-bronkolom niet zichtbaar is', () => {
    const v = {};
    applyLookups(v, 'whsl', [vendorLookup], 'master', { vendorAccount: 'Q000101' });
    expect(v.vendorOrgName).toBe('Negende Generatie Beheer BV');
  });

  it('gebruikt alias-keys wanneer de actieve target-key nog geen waarde bevat', () => {
    const v = { vendorAccount: 'Q000101' };
    applyLookups(v, 'whsl', [{
      ...vendorLookup,
      fieldEntries: [['vendors_vendorGroupId', 'vendorGroupId']],
      byKey: new Map([['whsl|Q000101', { vendorGroup: 'GRC' }]]),
      targetAliasesByKey: { vendorGroupId: ['vendorGroup'] },
    }], 'master');
    expect(v.vendors_vendorGroupId).toBe('GRC');
  });
});

describe('TableDataService.normalizeExclusionRows', () => {
  it('trimt en behoudt geldige rijen', () => {
    expect(normalizeExclusionRows([{ partitionKey: ' whsl ', recordKey: ' PO-1 ' }]))
      .toEqual([{ partitionKey: 'whsl', recordKey: 'PO-1' }]);
  });

  it('weert rijen zonder partitie of record', () => {
    expect(normalizeExclusionRows([{ partitionKey: 'whsl' }, { recordKey: 'PO-1' }, {}])).toEqual([]);
  });

  it('dedupliceert dubbele (partitie, record)', () => {
    const out = normalizeExclusionRows([
      { partitionKey: 'whsl', recordKey: 'PO-1' },
      { partitionKey: 'whsl', recordKey: 'PO-1' },
      { partitionKey: 'whsl', recordKey: 'PO-2' },
    ]);
    expect(out).toEqual([
      { partitionKey: 'whsl', recordKey: 'PO-1' },
      { partitionKey: 'whsl', recordKey: 'PO-2' },
    ]);
  });

  it('weert te lange sleutels en niet-arrays', () => {
    expect(normalizeExclusionRows([{ partitionKey: 'x'.repeat(33), recordKey: 'PO-1' }])).toEqual([]);
    expect(normalizeExclusionRows(null)).toEqual([]);
  });
});

describe('TableDataService.formule-evaluatie in read-flow', () => {
  it('compileert formulekolommen en evalueert per rij', () => {
    const formulas = compileMasterFormulaColumns([
      { key: 'delta', dataType: 'number', formulaExpr: '(inkoop)-(budget)' },
    ]);
    const values = { inkoop: 12, budget: 7 };
    const errors = applyFormulaColumnsToRowValues(values, formulas);
    expect(values.delta).toBe(5);
    expect(errors).toEqual({});
  });

  it('rapporteert formulefouten zonder crash', () => {
    const formulas = compileMasterFormulaColumns([
      { key: 'ratio', dataType: 'number', formulaExpr: '(a)/(b)' },
    ]);
    const values = { a: 10, b: 0 };
    const errors = applyFormulaColumnsToRowValues(values, formulas);
    expect(values.ratio).toBeNull();
    expect(errors.ratio).toContain('Deling door nul');
  });

  it('evalueert referenties hoofdletter-onafhankelijk', () => {
    const formulas = compileMasterFormulaColumns([
      { key: 'statusCheck', dataType: 'text', formulaExpr: "ALS((requesteddeliverydate)<(confirmeddeliverydate);'kleiner';'groter')" },
    ]);
    const values = {
      requestedDeliveryDate: '2026-07-01',
      confirmedDeliveryDate: '2026-07-05',
    };
    const errors = applyFormulaColumnsToRowValues(values, formulas);
    expect(values.statusCheck).toBe('kleiner');
    expect(errors).toEqual({});
  });
});

describe('TableDataService.assertCustomColumnWritable', () => {
  it('weigert formulekolommen voor handmatige save', () => {
    expect(() => assertCustomColumnWritable({
      source: 'custom',
      formulaExpr: '(a)+(b)',
    })).toThrow(/read-only/i);
  });

  it('accepteert gewone custom kolommen', () => {
    expect(() => assertCustomColumnWritable({
      source: 'custom',
      formulaExpr: null,
    })).not.toThrow();
  });
});

describe('TableDataService.resolveSourceColumnValue', () => {
  it('gebruikt sourceField wanneer key anders is', () => {
    const sourceJson = { RequestedDeliveryDate: '2026-07-12' };
    const value = resolveSourceColumnValue(sourceJson, {
      key: 'requestedDeliveryDate',
      sourceField: 'RequestedDeliveryDate',
    });
    expect(value).toBe('2026-07-12');
  });

  it('valt terug op key wanneer sourceField ontbreekt', () => {
    const sourceJson = { requestedDeliveryDate: '2026-07-12' };
    const value = resolveSourceColumnValue(sourceJson, {
      key: 'requestedDeliveryDate',
      sourceField: null,
    });
    expect(value).toBe('2026-07-12');
  });
});

describe('TableDataService runtime linked header values', () => {
  it('berekent line total link en zet headerwaarde', () => {
    const masterValues = { aantal_total_2: null };
    const details = [
      { values: { quantity: 2 } },
      { values: { quantity: '3' } },
      { values: { quantity: null } },
    ];
    applyRuntimeLinkedHeaderValues(masterValues, details, {
      lineTotalHeaderLinks: [{ lineColumnKey: 'quantity', headerColumnKey: 'aantal_total_2' }],
      lineValueHeaderLinks: [],
    });
    expect(masterValues.aantal_total_2).toBe(5);
  });

  it('calculateLinkedLineTotal telt robuust numerieke waarden', () => {
    const total = calculateLinkedLineTotal(
      [
        { values: { quantity: '1,5' } },
        { values: { quantity: '2.5' } },
        { values: { quantity: 'x' } },
      ],
      'quantity'
    );
    expect(total).toBe(4);
  });

  it('zet unieke lijnwaarden alleen op een expliciet gekoppelde headerkolom', () => {
    const masterValues = { item_values: null };
    const details = [
      { values: { items_searchName: 'Item A' } },
      { values: { items_searchName: 'Item B' } },
      { values: { items_searchName: 'Item A' } },
    ];
    applyRuntimeLinkedHeaderValues(masterValues, details, {
      lineTotalHeaderLinks: [],
      lineValueHeaderLinks: [{
        lineColumnKey: 'items_searchName',
        headerColumnKey: 'item_values',
      }],
    });
    expect(masterValues).toEqual({ item_values: 'Item A, Item B' });
  });
});

describe('TableDataService lookup column scopes', () => {
  it('houdt detail-lookups uit de hoofditemkolommen', () => {
    const masterCols = [];
    const detailCols = [];
    const itemColumns = [{ key: 'items_searchName', scope: 'detail' }];

    addLookupColumnsByScope('detail', itemColumns, masterCols, detailCols);

    expect(masterCols).toEqual([]);
    expect(detailCols).toEqual(itemColumns);
  });
});

describe('TableDataService fetch adapters (#195)', () => {
  it('registreert adapters voor purchase-orders, vendors en items', () => {
    expect(typeof FETCH_ADAPTERS['purchase-orders']).toBe('function');
    expect(typeof FETCH_ADAPTERS.vendors).toBe('function');
    expect(typeof FETCH_ADAPTERS.items).toBe('function');
  });
});

describe('TableDataService.resolveConfiguredMaxItems', () => {
  it('gebruikt expliciete settingwaarde wanneer geldig', () => {
    expect(resolveConfiguredMaxItems('500', 2000, 1000)).toBe(500);
  });

  it('valt terug op tabel maxRows wanneer setting ontbreekt', () => {
    expect(resolveConfiguredMaxItems(null, 10000, 2000)).toBe(10000);
  });
});

describe('TableDataService.requiredMasterFieldsFromTable', () => {
  it('forceert geen ModifiedDateTime voor generieke entiteiten', () => {
    expect(requiredMasterFieldsFromTable({
      keyFields: ['dataAreaId', 'VendorAccountNumber'],
    })).toEqual(['dataAreaId', 'VendorAccountNumber']);
  });
});

describe('TableDataService.buildLookupFieldMap', () => {
  it('behoudt bestaande derived keys wanneer dezelfde targetvelden geselecteerd blijven', () => {
    const map = buildLookupFieldMap({
      targetTableKey: 'vendors',
      targetFieldKeys: ['vendorOrganizationName', 'partyNumber'],
      existingFields: {
        vendorOrganizationName: 'vendorOrganizationName',
        vendors_partyNumber: 'partyNumber',
      },
    });
    expect(map).toEqual({
      vendorOrganizationName: 'vendorOrganizationName',
      vendors_partyNumber: 'partyNumber',
    });
  });

  it('maakt stabiele prefixed keys voor nieuw geselecteerde velden', () => {
    const map = buildLookupFieldMap({
      targetTableKey: 'items',
      targetFieldKeys: ['searchName', 'itemGroupId'],
      existingFields: {},
    });
    expect(map).toEqual({
      items_searchName: 'searchName',
      items_itemGroupId: 'itemGroupId',
    });
  });
});

describe('TableDataService.resolveLookupSourceKey', () => {
  it('mapt relation source_field naar de lokale kolomkey via sourceField', () => {
    const sourceKey = resolveLookupSourceKey(
      { sourceField: 'OrderVendorAccountNumber' },
      [
        { source: 'source', key: 'vendorAccount', sourceField: 'OrderVendorAccountNumber' },
        { source: 'source', key: 'orderNumber', sourceField: 'PurchaseOrderNumber' },
      ]
    );
    expect(sourceKey).toBe('vendorAccount');
  });

  it('is tolerant voor hoofdletters in relation source_field', () => {
    const sourceKey = resolveLookupSourceKey(
      { sourceField: 'ItemNumber' },
      [
        { source: 'source', key: 'itemNumber', sourceField: 'ItemNumber' },
      ]
    );
    expect(sourceKey).toBe('itemNumber');
  });
});

describe('TableDataService.resolveLookupTargetSourceField', () => {
  it('mapt target_key_field op kolom key naar sourceField voor D365 filter', () => {
    const targetField = resolveLookupTargetSourceField(
      { targetKeyField: 'vendorAccountNumber' },
      [
        { key: 'vendorAccountNumber', sourceField: 'VendorAccountNumber' },
        { key: 'vendorGroupId', sourceField: 'VendorGroupId' },
      ]
    );
    expect(targetField).toBe('VendorAccountNumber');
  });

  it('behoudt het veld wanneer geen kolom-mapping bestaat', () => {
    const targetField = resolveLookupTargetSourceField(
      { targetKeyField: 'ItemNumber' },
      [{ key: 'searchName', sourceField: 'SearchName' }]
    );
    expect(targetField).toBe('ItemNumber');
  });
});

describe('TableDataService.resolveLookupProjectionColumns', () => {
  it('neemt lookup-bronkolommen mee, ook als die inactief zijn', () => {
    const resolved = resolveLookupProjectionColumns({
      scope: 'master',
      activeColumns: [
        { key: 'orderNumber', source: 'source' },
      ],
      allColumns: [
        { key: 'orderNumber', source: 'source' },
        { key: 'vendorAccount', source: 'source' },
      ],
      lookups: [
        { sourceScope: 'master', sourceField: 'vendorAccount' },
      ],
    });
    expect(resolved.map((column) => column.key)).toEqual(['orderNumber', 'vendorAccount']);
  });

  it('voegt geen onbekende lookup-bronkolommen toe', () => {
    const resolved = resolveLookupProjectionColumns({
      scope: 'master',
      activeColumns: [{ key: 'orderNumber', source: 'source' }],
      allColumns: [{ key: 'orderNumber', source: 'source' }],
      lookups: [{ sourceScope: 'master', sourceField: 'vendorAccount' }],
    });
    expect(resolved.map((column) => column.key)).toEqual(['orderNumber']);
  });

  it('resolveert relation source_field via sourceField naar lokale key', () => {
    const resolved = resolveLookupProjectionColumns({
      scope: 'detail',
      activeColumns: [{ key: 'lineNumber', source: 'source' }],
      allColumns: [
        { key: 'lineNumber', source: 'source', sourceField: 'LineNumber' },
        { key: 'itemNumber', source: 'source', sourceField: 'ItemNumber' },
      ],
      lookups: [{ sourceScope: 'detail', sourceField: 'ItemNumber' }],
    });
    expect(resolved.map((column) => column.key)).toEqual(['lineNumber', 'itemNumber']);
  });
});

describe('TableDataService.buildLookupDedupeSignature', () => {
  it('dedupliceert lookup-relaties op scope + source + target table', () => {
    const a = buildLookupDedupeSignature({
      sourceScope: 'master',
      sourceFieldKey: 'vendorAccount',
      targetTableKey: 'vendors',
    });
    const b = buildLookupDedupeSignature({
      sourceScope: 'master',
      sourceFieldKey: 'vendorAccount',
      targetTableKey: 'vendors',
    });
    expect(a).toBe(b);
  });
});

describe('TableDataService.buildLookupTargetAliases', () => {
  it('neemt inactieve alias-keys met hetzelfde sourceField mee', () => {
    const aliases = buildLookupTargetAliases(
      [{ key: 'vendorGroupId', sourceField: 'VendorGroupId' }],
      [
        { key: 'vendorGroupId', sourceField: 'VendorGroupId' },
        { key: 'vendorGroup', sourceField: 'VendorGroupId' },
      ]
    );
    expect(aliases).toEqual({
      vendorGroupId: ['VendorGroupId', 'vendorGroup'],
    });
  });
});
