'use strict';

const { computeOrderHash, normalizeExclusionRows } = require('./D365PurchaseOrderCacheService');

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

describe('D365PurchaseOrderCacheService.normalizeExclusionRows', () => {
  it('trimt en behoudt geldige rijen', () => {
    expect(normalizeExclusionRows([{ dataAreaId: ' vb ', orderNumber: ' PO-1 ' }]))
      .toEqual([{ dataAreaId: 'vb', orderNumber: 'PO-1' }]);
  });

  it('filtert rijen zonder dataAreaId of orderNumber', () => {
    const result = normalizeExclusionRows([
      { dataAreaId: 'vb', orderNumber: '' },
      { dataAreaId: '', orderNumber: 'PO-2' },
      { orderNumber: 'PO-3' },
      { dataAreaId: 'vb', orderNumber: 'PO-4' },
    ]);
    expect(result).toEqual([{ dataAreaId: 'vb', orderNumber: 'PO-4' }]);
  });

  it('filtert te lange sleutels (dataAreaId > 16 of orderNumber > 64)', () => {
    const result = normalizeExclusionRows([
      { dataAreaId: 'x'.repeat(17), orderNumber: 'PO-1' },
      { dataAreaId: 'vb', orderNumber: 'y'.repeat(65) },
      { dataAreaId: 'vb', orderNumber: 'PO-2' },
    ]);
    expect(result).toEqual([{ dataAreaId: 'vb', orderNumber: 'PO-2' }]);
  });

  it('ontdubbelt op (dataAreaId, orderNumber)', () => {
    const result = normalizeExclusionRows([
      { dataAreaId: 'vb', orderNumber: 'PO-1' },
      { dataAreaId: 'vb', orderNumber: 'PO-1' },
    ]);
    expect(result).toHaveLength(1);
  });

  it('geeft een lege lijst voor niet-array input', () => {
    expect(normalizeExclusionRows(null)).toEqual([]);
    expect(normalizeExclusionRows(undefined)).toEqual([]);
  });
});
