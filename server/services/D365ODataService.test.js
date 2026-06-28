'use strict';

const {
  buildPurchaseOrderUrl,
  mapPurchaseOrder,
  fetchPurchaseOrders,
  escapeODataLiteral,
  getAccessToken,
  __resetOAuthTokenCache,
} = require('./D365ODataService');

describe('D365ODataService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.D365_ODATA_BASE_URL = 'https://example.operations.dynamics.com';
    process.env.D365_ODATA_PURCHASE_ORDERS_PATH = '/data/PurchaseOrderHeadersV2';
    process.env.D365_ODATA_COMPANY = 'WHSL';
    process.env.D365_ODATA_TIMEOUT_MS = '2000';
    // Geen client-credentials in basis-tests → buildHeaders valt terug op statisch/geen token.
    delete process.env.D365_ODATA_TENANT_ID;
    delete process.env.D365_ODATA_CLIENT_ID;
    delete process.env.D365_ODATA_CLIENT_SECRET;
    delete process.env.D365_ODATA_BEARER_TOKEN;
    __resetOAuthTokenCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    __resetOAuthTokenCache();
    vi.restoreAllMocks();
  });

  it('escapet OData string literals veilig', () => {
    expect(escapeODataLiteral("a'b")).toBe("a''b");
  });

  it('bouwt URL met escaped filter waarden', async () => {
    const url = await buildPurchaseOrderUrl({
      supplierAccount: "SUPP'01",
      top: 25,
      skip: 0,
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('$top')).toBe('25');
    expect(parsed.searchParams.get('$skip')).toBe('0');
    expect(parsed.searchParams.get('$count')).toBe('true');
    expect(parsed.searchParams.get('$expand')).toBe('PurchaseOrderLines');
    expect(parsed.searchParams.get('cross-company')).toBe('true');
    expect(parsed.searchParams.get('$filter')).toContain("dataAreaId eq 'WHSL'");
    expect(parsed.searchParams.get('$filter')).toContain("OrderVendorAccountNumber eq 'SUPP''01'");
  });

  it('bouwt URL zonder supplier filter voor staff', async () => {
    const url = await buildPurchaseOrderUrl({ supplierAccount: null, top: 10, skip: 0 });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('$filter')).toBe("dataAreaId eq 'WHSL'");
  });

  it('mapt purchase order velden naar intern model', () => {
    const mapped = mapPurchaseOrder({
      PurchaseOrderNumber: 'PO-1001',
      OrderVendorAccountNumber: 'Q000104',
      PurchaseOrderName: 'Vendor BV',
      PurchaseOrderStatus: 'Open',
      CurrencyCode: 'EUR',
      RequestedDeliveryDate: '2026-06-10',
    });

    expect(mapped.orderNumber).toBe('PO-1001');
    expect(mapped.vendorAccount).toBe('Q000104');
    expect(mapped.vendorName).toBe('Vendor BV');
    expect(mapped.status).toBe('Open');
  });

  it('haalt purchase orders op en retourneert mapped items', async () => {
    const fetchSpy = vi.fn().mockImplementation(async (url) => {
      if (String(url).includes('/data/VendorsV2')) {
        return {
          ok: true,
          json: async () => ({
            value: [
              {
                VendorAccountNumber: 'SUPP20',
                VendorOrganizationName: 'Leverancier 20',
                VendorGroupId: 'GRC',
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          '@odata.count': 1,
          value: [
            {
              PurchaseOrderNumber: 'PO-2001',
              OrderVendorAccountNumber: 'SUPP20',
              PurchaseOrderName: 'Leverancier 20',
              PurchaseOrderStatus: 'InReview',
              PurchaseOrderLines: [
                {
                  PurchaseOrderNumber: 'PO-2001',
                  LineNumber: 1,
                  ItemNumber: 'ART-1',
                  LineDescription: 'Artikel 1',
                  OrderedPurchaseQuantity: 10,
                },
              ],
            },
          ],
        }),
      };
    });
    global.fetch = fetchSpy;

    const result = await fetchPurchaseOrders({
      supplierAccount: 'SUPP20',
      top: 10,
      skip: 0,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.total).toBe(1);
    expect(result.items[0].orderNumber).toBe('PO-2001');
    expect(result.items[0].lineCount).toBe(1);
    expect(result.items[0].vendor?.name).toBe('Leverancier 20');
  });

  describe('OAuth2 client-credentials', () => {
    beforeEach(() => {
      process.env.D365_ODATA_TENANT_ID = '0392ec91-927c-4e81-884d-d21d2cd99be1';
      process.env.D365_ODATA_CLIENT_ID = 'client-abc';
      process.env.D365_ODATA_CLIENT_SECRET = 'secret-xyz';
      __resetOAuthTokenCache();
    });

    it('haalt een token op via de client-credentials flow met scope <base>/.default', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'tok-1', expires_in: 3600 }),
      });
      global.fetch = fetchSpy;

      const token = await getAccessToken();

      expect(token).toBe('tok-1');
      const [calledUrl, options] = fetchSpy.mock.calls[0];
      expect(String(calledUrl)).toContain('login.microsoftonline.com/0392ec91-927c-4e81-884d-d21d2cd99be1/oauth2/v2.0/token');
      const body = options.body.toString();
      expect(body).toContain('grant_type=client_credentials');
      expect(body).toContain('scope=https%3A%2F%2Fexample.operations.dynamics.com%2F.default');
    });

    it('cachet het token en haalt het niet opnieuw op binnen de geldigheid', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'tok-cache', expires_in: 3600 }),
      });
      global.fetch = fetchSpy;

      const first = await getAccessToken();
      const second = await getAccessToken();

      expect(first).toBe('tok-cache');
      expect(second).toBe('tok-cache');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('zet het token als Bearer-header op de OData-call (token + PO + vendors = 3 calls)', async () => {
      const fetchSpy = vi.fn().mockImplementation(async (url, options) => {
        const urlString = String(url);
        if (urlString.includes('login.microsoftonline.com')) {
          return { ok: true, json: async () => ({ access_token: 'tok-hdr', expires_in: 3600 }) };
        }
        if (urlString.includes('/data/VendorsV2')) {
          return { ok: true, json: async () => ({ value: [] }) };
        }
        // PO-call moet het bearer token meekrijgen
        expect(options.headers.Authorization).toBe('Bearer tok-hdr');
        return {
          ok: true,
          json: async () => ({
            '@odata.count': 1,
            value: [{ PurchaseOrderNumber: 'PO-9001', OrderVendorAccountNumber: 'SUPP90' }],
          }),
        };
      });
      global.fetch = fetchSpy;

      const result = await fetchPurchaseOrders({ supplierAccount: 'SUPP90', top: 10, skip: 0 });

      expect(result.items[0].orderNumber).toBe('PO-9001');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });
  });

  it("haalt alle pagina's op als fetchAll aan staat", async () => {
    const fetchSpy = vi.fn().mockImplementation(async (url) => {
      const urlString = String(url);

      if (urlString.includes('/data/VendorsV2')) {
        return {
          ok: true,
          json: async () => ({ value: [] }),
        };
      }

      if (urlString.includes('skip=2')) {
        return {
          ok: true,
          json: async () => ({
            value: [{ PurchaseOrderNumber: 'PO-3003', OrderVendorAccountNumber: 'SUPP30' }],
          }),
        };
      }

      if (urlString.includes('/data/PurchaseOrderHeadersV2')) {
        return {
          ok: true,
          json: async () => ({
            '@odata.count': 3,
            '@odata.nextLink': 'https://example.operations.dynamics.com/data/PurchaseOrderHeadersV2?$top=2&$skip=2',
            value: [
              { PurchaseOrderNumber: 'PO-3001', OrderVendorAccountNumber: 'SUPP30' },
              { PurchaseOrderNumber: 'PO-3002', OrderVendorAccountNumber: 'SUPP30' },
            ],
          }),
        };
      }

      throw new Error('Onverwachte test-URL: ' + urlString);
    });
    global.fetch = fetchSpy;

    const result = await fetchPurchaseOrders({
      supplierAccount: 'SUPP30',
      top: 2,
      skip: 0,
      fetchAll: true,
    });

    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(3);
    expect(result.pagesFetched).toBe(2);
    expect(result.fetchedAll).toBe(true);
  });
});
