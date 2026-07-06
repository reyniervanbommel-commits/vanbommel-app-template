'use strict';

const {
  computeContentHash,
  applyLookups,
  normalizeExclusionRows,
  compileMasterFormulaColumns,
  applyFormulaColumnsToRowValues,
  resolveSourceColumnValue,
  calculateLinkedLineTotal,
  applyRuntimeLinkedHeaderValues,
  assertCustomColumnWritable,
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
});

describe('TableDataService fetch adapters (#195)', () => {
  it('registreert adapters voor purchase-orders, vendors en items', () => {
    expect(typeof FETCH_ADAPTERS['purchase-orders']).toBe('function');
    expect(typeof FETCH_ADAPTERS.vendors).toBe('function');
    expect(typeof FETCH_ADAPTERS.items).toBe('function');
  });
});
