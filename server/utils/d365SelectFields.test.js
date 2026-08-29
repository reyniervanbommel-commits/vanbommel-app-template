'use strict';

const {
  FORBIDDEN_LINE_D365_FIELDS,
  buildD365SelectFields,
} = require('./d365SelectFields');

describe('buildD365SelectFields', () => {
  it('laat RemainingPurchasePhysicalQuantity weg, ook als de kolom actief is', () => {
    const fields = buildD365SelectFields(
      ['PurchaseOrderNumber', 'LineNumber'],
      [
        { source: 'source', sourceField: 'ItemNumber' },
        { source: 'source', sourceField: 'RemainingPurchasePhysicalQuantity' },
      ],
      FORBIDDEN_LINE_D365_FIELDS,
    );
    expect(fields).toEqual(['PurchaseOrderNumber', 'LineNumber', 'ItemNumber']);
    expect(fields).not.toContain('RemainingPurchasePhysicalQuantity');
  });

  it('neemt custom-kolommen en @-annotaties niet op', () => {
    const fields = buildD365SelectFields(
      ['PurchaseOrderNumber'],
      [
        { source: 'custom', sourceField: 'ItemNumber' },
        { source: 'source', sourceField: '@odata.etag' },
      ],
      FORBIDDEN_LINE_D365_FIELDS,
    );
    expect(fields).toEqual(['PurchaseOrderNumber']);
  });
});
