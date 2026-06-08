'use strict';

const {
  buildPurchaseOrderUrl,
  mapPurchaseOrder,
  fetchPurchaseOrders,
  escapeODataLiteral,
} = require('./D365ODataService');

describe('D365ODataService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.D365_ODATA_BASE_URL = 'https://example.operations.dynamics.com';
    process.env.D365_ODATA_PURCHASE_ORDERS_PATH = '/data/PurchaseOrderHeadersV2';
    process.env.D365_ODATA_COMPANY = 'usmf';
    process.env.D365_ODATA_TIMEOUT_MS = '2000';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('escapet OData string literals veilig', () => {
    expect(escapeODataLiteral("a'b")).toBe("a''b");
  });

  it('bouwt URL met escaped filter waarden', () => {
    const url = buildPurchaseOrderUrl({
      supplierAccount: "SUPP'01",
      top: 25,
      skip: 0,
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('$top')).toBe('25');
    expect(parsed.searchParams.get('$skip')).toBe('0');
    expect(parsed.searchParams.get('cross-company')).toBe('true');
    expect(parsed.searchParams.get('$filter')).toContain("dataAreaId eq 'usmf'");
    expect(parsed.searchParams.get('$filter')).toContain("OrderAccount eq 'SUPP''01'");
  });

  it('mapt purchase order velden naar intern model', () => {
    const mapped = mapPurchaseOrder({
      PurchaseOrderNumber: 'PO-1001',
      OrderAccount: 'SUPP01',
      VendorName: 'Vendor BV',
      DocumentStatus: 'Open',
      CurrencyCode: 'EUR',
      RequestedDeliveryDate: '2026-06-10',
    });

    expect(mapped.orderNumber).toBe('PO-1001');
    expect(mapped.vendorAccount).toBe('SUPP01');
    expect(mapped.vendorName).toBe('Vendor BV');
    expect(mapped.status).toBe('Open');
  });

  it('haalt purchase orders op en retourneert mapped items', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        value: [
          {
            PurchaseOrderNumber: 'PO-2001',
            OrderAccount: 'SUPP20',
            VendorName: 'Leverancier 20',
            DocumentStatus: 'InReview',
          },
        ],
      }),
    });
    global.fetch = fetchSpy;

    const result = await fetchPurchaseOrders({
      supplierAccount: 'SUPP20',
      top: 10,
      skip: 0,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(1);
    expect(result.items[0].orderNumber).toBe('PO-2001');
  });
});
