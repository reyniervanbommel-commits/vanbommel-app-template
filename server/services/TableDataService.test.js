'use strict';

const { computeContentHash, applyLookups } = require('./TableDataService');

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
