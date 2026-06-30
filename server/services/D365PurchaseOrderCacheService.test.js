'use strict';

const { computeOrderHash } = require('./D365PurchaseOrderCacheService');

describe('D365PurchaseOrderCacheService.computeOrderHash', () => {
  const base = {
    vendorAccount: 'Q000104',
    vendorName: 'Vendor BV',
    status: 'Open',
    currencyCode: 'EUR',
    requestedDeliveryDate: '2026-07-01',
    createdDateTime: '2026-06-01',
    lines: [
      { lineNumber: 1, itemNumber: 'ART-1', quantity: 10, unit: 'pcs', lineAmount: 100, description: 'Artikel 1' },
    ],
  };

  it('is deterministisch voor dezelfde inhoud', () => {
    expect(computeOrderHash(base)).toBe(computeOrderHash({ ...base }));
  });

  it('is onafhankelijk van de regelvolgorde', () => {
    const twoLines = { ...base, lines: [base.lines[0], { lineNumber: 2, itemNumber: 'ART-2', quantity: 5, unit: 'pcs', lineAmount: 50, description: 'Artikel 2' }] };
    const reversed = { ...twoLines, lines: [...twoLines.lines].reverse() };
    expect(computeOrderHash(twoLines)).toBe(computeOrderHash(reversed));
  });

  it('wijzigt wanneer een header-veld verandert', () => {
    expect(computeOrderHash({ ...base, status: 'Confirmed' })).not.toBe(computeOrderHash(base));
  });

  it('wijzigt wanneer een regel verandert', () => {
    const changedLine = { ...base, lines: [{ ...base.lines[0], quantity: 11 }] };
    expect(computeOrderHash(changedLine)).not.toBe(computeOrderHash(base));
  });

  it('werkt zonder regels', () => {
    expect(typeof computeOrderHash({ ...base, lines: [] })).toBe('string');
  });
});
