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

describe('TableDataService.applyLookups (fk_join-verrijking)', () => {
  // Eén master-lookup: PO.header.vendorAccount -> vendors, afgeleide kolom 'vendorOrgName' <- vendors.vendorName.
  const vendorLookup = {
    sourceScope: 'master',
    sourceField: 'vendorAccount',
    fieldEntries: [['vendorOrgName', 'vendorName']],
    byKey: new Map([
      ['whsl|Q000101', { vendorName: 'Negende Generatie Beheer BV' }],
    ]),
  };

  it('verrijkt met de doelwaarde op een match (partition|recordKey)', () => {
    const values = { vendorAccount: 'Q000101' };
    applyLookups(values, 'whsl', [vendorLookup], 'master');
    expect(values.vendorOrgName).toBe('Negende Generatie Beheer BV');
  });

  it('geeft null bij een ontbrekende doel-cache (graceful)', () => {
    const values = { vendorAccount: 'ONBEKEND' };
    applyLookups(values, 'whsl', [vendorLookup], 'master');
    expect(values.vendorOrgName).toBeNull();
  });

  it('geeft null bij een lege FK-waarde', () => {
    const values = { vendorAccount: '' };
    applyLookups(values, 'whsl', [vendorLookup], 'master');
    expect(values.vendorOrgName).toBeNull();
  });

  it('respecteert de partition (andere dataAreaId => geen match)', () => {
    const values = { vendorAccount: 'Q000101' };
    applyLookups(values, 'anders', [vendorLookup], 'master');
    expect(values.vendorOrgName).toBeNull();
  });

  it('slaat lookups met een andere scope over', () => {
    const values = { vendorAccount: 'Q000101' };
    applyLookups(values, 'whsl', [vendorLookup], 'detail');
    expect('vendorOrgName' in values).toBe(false);
  });

  it('trimt de FK-waarde vóór het matchen', () => {
    const values = { vendorAccount: '  Q000101 ' };
    applyLookups(values, 'whsl', [vendorLookup], 'master');
    expect(values.vendorOrgName).toBe('Negende Generatie Beheer BV');
  });
});
