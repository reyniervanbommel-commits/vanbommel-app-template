'use strict';

const { compileSyncRules, compileSyncRulesChunks, parseSyncRules, recordMatchesSyncRules } = require('./odataSyncFilter');

describe('compileSyncRules (D365-syncfilters)', () => {
  it('compileert een tekst-regel met quoting en escaping', () => {
    expect(compileSyncRules([
      { field: 'OrderVendorAccountNumber', operator: 'eq', value: "V'01", valueType: 'text' },
    ])).toBe("OrderVendorAccountNumber eq 'V''01'");
  });

  it('compileert een enum-regel met de volledige namespace-notatie', () => {
    expect(compileSyncRules([
      { field: 'PurchaseOrderStatus', operator: 'eq', value: 'Backorder', valueType: 'enum', enumType: 'PurchStatus' },
    ])).toBe("PurchaseOrderStatus eq Microsoft.Dynamics.DataEntities.PurchStatus'Backorder'");
  });

  it('compileert getal-, datum- en contains-regels en combineert met and', () => {
    const compiled = compileSyncRules([
      { field: 'LineAmount', operator: 'ge', value: '100', valueType: 'number' },
      { field: 'RequestedDeliveryDate', operator: 'ge', value: '2026-01-01', valueType: 'date' },
      { field: 'KRFOriginCreatedDateTime', operator: 'lt', value: '2026-07-01', valueType: 'date' },
      { field: 'PurchaseOrderName', operator: 'contains', value: 'staal', valueType: 'text' },
    ]);
    expect(compiled).toContain('LineAmount ge 100');
    expect(compiled).toContain('RequestedDeliveryDate ge 2026-01-01T00:00:00.000Z');
    expect(compiled).toContain('KRFOriginCreatedDateTime lt 2026-07-01T00:00:00.000Z');
    expect(compiled).toContain("contains(PurchaseOrderName,'staal')");
    expect(compiled.split(' and ')).toHaveLength(4);
  });

  it('compileert line-level regels via any()-lambda', () => {
    const compiled = compileSyncRules([
      { level: 'line', field: 'ItemNumber', operator: 'startswith', value: 'A', valueType: 'text' },
    ]);
    expect(compiled).toBe("PurchaseOrderLines/any(l: startswith(l/ItemNumber,'A'))");
  });

  it('ondersteunt notcontains en oneof', () => {
    const compiled = compileSyncRules([
      { field: 'PurchaseOrderName', operator: 'notcontains', value: 'test', valueType: 'text' },
      { field: 'OrderVendorAccountNumber', operator: 'oneof', valueType: 'text', value: ['1001', '1002'] },
    ]);
    expect(compiled).toContain("not contains(PurchaseOrderName,'test')");
    expect(compiled).toContain("(OrderVendorAccountNumber eq '1001' or OrderVendorAccountNumber eq '1002')");
  });

  it('staat meer dan 20 one-of waarden toe en chunked ze voor D365', () => {
    const values = Array.from({ length: 25 }, (_, i) => `V${String(i).padStart(6, '0')}`);
    const rules = [{
      field: 'OrderVendorAccountNumber',
      operator: 'oneof',
      valueType: 'text',
      value: values.join(', '),
    }];
    const compiled = compileSyncRules(rules);
    expect(compiled.split(' or ')).toHaveLength(25);
    const chunks = compileSyncRulesChunks(rules);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].split(' or ')).toHaveLength(20);
    expect(chunks[1].split(' or ')).toHaveLength(5);
  });

  it('weigert twee grote one-of regels tegelijk', () => {
    const values = Array.from({ length: 21 }, (_, i) => `V${i}`);
    expect(() => compileSyncRules([
      { field: 'OrderVendorAccountNumber', operator: 'oneof', valueType: 'text', value: values },
      { field: 'PurchaseOrderName', operator: 'oneof', valueType: 'text', value: values },
    ])).toThrow(/Only one "is one of" filter/);
  });

  it('weigert meer dan 500 one-of waarden', () => {
    const values = Array.from({ length: 501 }, (_, i) => `V${i}`);
    expect(() => compileSyncRules([{
      field: 'OrderVendorAccountNumber',
      operator: 'oneof',
      valueType: 'text',
      value: values,
    }])).toThrow(/maximum 500 values/);
  });

  it('weigert ongeldige velden, operators en enum-waarden (injectiepreventie)', () => {
    expect(() => compileSyncRules([{ field: "Status' or 1 eq 1", operator: 'eq', value: 'x', valueType: 'text' }])).toThrow();
    expect(() => compileSyncRules([{ field: 'Status', operator: 'like', value: 'x', valueType: 'text' }])).toThrow();
    expect(() => compileSyncRules([{ field: 'Status', operator: 'eq', value: "Open'--", valueType: 'enum', enumType: 'PurchStatus' }])).toThrow();
    expect(() => compileSyncRules([{ field: 'Status', operator: 'gt', value: 'Open', valueType: 'enum', enumType: 'PurchStatus' }])).toThrow();
  });

  it('geeft een lege string bij geen regels', () => {
    expect(compileSyncRules([])).toBe('');
    expect(compileSyncRules(null)).toBe('');
  });
});

describe('parseSyncRules', () => {
  it('parseert geldige JSON en valt defensief terug op een lege lijst', () => {
    expect(parseSyncRules('[{"field":"A"}]')).toEqual([{ field: 'A' }]);
    expect(parseSyncRules('geen json')).toEqual([]);
    expect(parseSyncRules('')).toEqual([]);
    expect(parseSyncRules('{"niet":"een array"}')).toEqual([]);
  });
});

describe('recordMatchesSyncRules', () => {
  const backorderRule = [{
    level: 'header',
    field: 'PurchaseOrderStatus',
    operator: 'eq',
    value: 'Backorder',
    valueType: 'enum',
    enumType: 'PurchStatus',
  }];

  it('matcht op D365-veldnaam en status-alias', () => {
    expect(recordMatchesSyncRules(backorderRule, { PurchaseOrderStatus: 'Backorder' }, [])).toBe(true);
    expect(recordMatchesSyncRules(backorderRule, { status: 'Backorder' }, [])).toBe(true);
    expect(recordMatchesSyncRules(backorderRule, { status: 'Invoiced' }, [])).toBe(false);
  });

  it('combineert meerdere regels met AND', () => {
    const rules = [
      ...backorderRule,
      { level: 'header', field: 'OrderVendorAccountNumber', operator: 'eq', value: 'V001', valueType: 'text' },
    ];
    expect(recordMatchesSyncRules(rules, { status: 'Backorder', vendorAccount: 'V001' }, [])).toBe(true);
    expect(recordMatchesSyncRules(rules, { status: 'Backorder', vendorAccount: 'V002' }, [])).toBe(false);
  });

  it('geeft true bij geen actieve regels', () => {
    expect(recordMatchesSyncRules([], { status: 'Invoiced' }, [])).toBe(true);
  });
});
