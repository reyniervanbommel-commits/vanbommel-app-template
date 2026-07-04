'use strict';

const { isWriteBackAllowed, isHideAllowed, validateImageOptions } = require('./PurchaseOrderColumnsService');

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

describe('isHideAllowed (datamodel-zichtbaarheid)', () => {
  it('staat verbergen toe op gewone kolommen', () => {
    expect(isHideAllowed({ level: 'header', key: 'vendorName' })).toBe(true);
    expect(isHideAllowed({ level: 'line', key: 'description' })).toBe(true);
  });

  it('blokkeert verbergen van identificerende sleutelkolommen', () => {
    expect(isHideAllowed({ level: 'header', key: 'orderNumber' })).toBe(false);
    expect(isHideAllowed({ level: 'line', key: 'lineNumber' })).toBe(false);
  });
});

describe('validateImageOptions (#AB:178 image-kolom)', () => {
  it('accepteert een geldige image-config en normaliseert', () => {
    const result = validateImageOptions({
      urlTemplate: 'https://cdn.example.com/img/{xxx}.jpg',
      sourceColumnKey: 'itemNumber',
      transforms: [
        { type: 'trim' },
        { type: 'remove', value: ' ' },
        { type: 'replace', from: 'A', to: 'B' },
        { type: 'substring', start: 0, end: 5 },
      ],
    });
    expect(result).toEqual({
      urlTemplate: 'https://cdn.example.com/img/{xxx}.jpg',
      sourceColumnKey: 'itemNumber',
      transforms: [
        { type: 'trim' },
        { type: 'remove', value: ' ' },
        { type: 'replace', from: 'A', to: 'B' },
        { type: 'substring', start: 0, end: 5 },
      ],
    });
  });

  it('accepteert een config zonder transforms (leeg genormaliseerd)', () => {
    const result = validateImageOptions({
      urlTemplate: 'http://example.com/{xxx}',
      sourceColumnKey: 'itemNumber',
    });
    expect(result.transforms).toEqual([]);
  });

  it('weigert een urlTemplate zonder {xxx}-placeholder', () => {
    expect(() => validateImageOptions({
      urlTemplate: 'https://cdn.example.com/img.jpg',
      sourceColumnKey: 'itemNumber',
    })).toThrow(/xxx/);
  });

  it('weigert een niet-http(s) urlTemplate', () => {
    expect(() => validateImageOptions({
      urlTemplate: 'javascript:alert(1)/{xxx}',
      sourceColumnKey: 'itemNumber',
    })).toThrow(/http/);
    expect(() => validateImageOptions({
      urlTemplate: 'data:image/png;base64,{xxx}',
      sourceColumnKey: 'itemNumber',
    })).toThrow(/http/);
  });

  it('weigert een onbekend transform-type', () => {
    expect(() => validateImageOptions({
      urlTemplate: 'https://example.com/{xxx}',
      sourceColumnKey: 'itemNumber',
      transforms: [{ type: 'evil' }],
    })).toThrow(/transform/i);
  });

  it('weigert een ontbrekende sourceColumnKey', () => {
    expect(() => validateImageOptions({
      urlTemplate: 'https://example.com/{xxx}',
    })).toThrow(/sourceColumnKey/);
  });

  it('gooit fouten met status 400', () => {
    try {
      validateImageOptions({ urlTemplate: 'https://example.com/geen-placeholder', sourceColumnKey: 'x' });
      throw new Error('had moeten falen');
    } catch (err) {
      expect(err.status).toBe(400);
    }
  });
});
