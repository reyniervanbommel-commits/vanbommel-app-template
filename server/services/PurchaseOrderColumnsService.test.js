'use strict';

const { isWriteBackAllowed } = require('./PurchaseOrderColumnsService');

describe('isWriteBackAllowed (#134 denylist)', () => {
  it('staat write-back toe op een gewoon D365-veld', () => {
    expect(isWriteBackAllowed({ source: 'd365', d365Field: 'PurchaseOrderName', level: 'header', key: 'vendorName' })).toBe(true);
  });

  it('blokkeert sleutel- en boekings-/systeemvelden', () => {
    expect(isWriteBackAllowed({ source: 'd365', d365Field: 'PurchaseOrderNumber', level: 'header', key: 'orderNumber' })).toBe(false);
    expect(isWriteBackAllowed({ source: 'd365', d365Field: 'PurchaseOrderStatus', level: 'header', key: 'status' })).toBe(false);
    expect(isWriteBackAllowed({ source: 'd365', d365Field: 'LineNumber', level: 'line', key: 'lineNumber' })).toBe(false);
  });

  it('blokkeert eigen kolommen en velden zonder d365_field', () => {
    expect(isWriteBackAllowed({ source: 'custom', d365Field: null, level: 'header', key: 'opmerking' })).toBe(false);
    expect(isWriteBackAllowed({ source: 'd365', d365Field: null, level: 'header', key: 'vendorName' })).toBe(false);
  });
});
