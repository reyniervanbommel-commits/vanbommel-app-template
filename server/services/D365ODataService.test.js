'use strict';

const {
  buildPurchaseOrderUrl,
  mapPurchaseOrder,
  mapPurchaseOrderLine,
  fetchPurchaseOrders,
  escapeODataLiteral,
  getAccessToken,
  writeBackField,
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

  it('voegt een scope-filter (extraFilter) toe aan het $filter (B2)', async () => {
    const url = await buildPurchaseOrderUrl({
      supplierAccount: null,
      top: 5,
      skip: 0,
      extraFilter: "PurchaseOrderStatus ne 'Canceled'",
    });
    const filter = new URL(url).searchParams.get('$filter');
    expect(filter).toContain("dataAreaId eq 'WHSL'");
    expect(filter).toContain("(PurchaseOrderStatus ne 'Canceled')");
    expect(filter).toContain(' and ');
  });

  it('mapt regel-leverdatum uit het echte veld RequestedDeliveryDate (#131-2)', () => {
    const mapped = mapPurchaseOrderLine({
      PurchaseOrderNumber: 'PO-1',
      LineNumber: 1,
      RequestedDeliveryDate: '2026-07-01',
    });
    expect(mapped.requestedDeliveryDate).toBe('2026-07-01');
  });

  it('kapt de sync af op maxItems en markeert truncated (B2)', async () => {
    const fetchSpy = vi.fn().mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes('/data/VendorsV2')) {
        return { ok: true, json: async () => ({ value: [] }) };
      }
      // Elke PO-pagina levert 2 records + een nextLink (zou eindeloos doorlopen zonder cap).
      return {
        ok: true,
        json: async () => ({
          '@odata.count': 9999,
          '@odata.nextLink': 'https://example.operations.dynamics.com/data/PurchaseOrderHeadersV2?$top=2&$skip=2',
          value: [
            { PurchaseOrderNumber: 'PO-A', OrderVendorAccountNumber: 'SUPP' },
            { PurchaseOrderNumber: 'PO-B', OrderVendorAccountNumber: 'SUPP' },
          ],
        }),
      };
    });
    global.fetch = fetchSpy;

    const result = await fetchPurchaseOrders({ supplierAccount: null, top: 2, skip: 0, fetchAll: true, maxItems: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.truncated).toBe(true);
    expect(result.fetchedAll).toBe(false);
  });

  it('kapt ook binnen de eerste D365-pagina af wanneer maxItems kleiner is dan $top', async () => {
    const pageRecords = Array.from({ length: 50 }, (_, index) => ({
      PurchaseOrderNumber: `PO-${String(index + 1).padStart(3, '0')}`,
      OrderVendorAccountNumber: 'SUPP',
    }));
    global.fetch = vi.fn().mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes('/data/VendorsV2')) {
        return { ok: true, json: async () => ({ value: [] }) };
      }
      return {
        ok: true,
        json: async () => ({
          '@odata.count': 924,
          value: pageRecords,
        }),
      };
    });

    const result = await fetchPurchaseOrders({ supplierAccount: null, top: 50, skip: 0, fetchAll: true, maxItems: 10 });

    expect(result.items).toHaveLength(10);
    expect(result.total).toBe(924);
    expect(result.truncated).toBe(true);
    expect(result.fetchedAll).toBe(false);
  });

  it('pagineert handmatig verder wanneer D365 wel count maar geen nextLink teruggeeft', async () => {
    const calls = [];
    global.fetch = vi.fn().mockImplementation(async (url) => {
      const urlString = String(url);
      calls.push(urlString);
      if (urlString.includes('/data/VendorsV2')) {
        return { ok: true, json: async () => ({ value: [] }) };
      }
      const parsed = new URL(urlString);
      const skipValue = Number.parseInt(parsed.searchParams.get('$skip') || '0', 10);
      return {
        ok: true,
        json: async () => ({
          '@odata.count': 120,
          value: Array.from({ length: 50 }, (_, index) => ({
            PurchaseOrderNumber: `PO-${skipValue + index + 1}`,
            OrderVendorAccountNumber: 'SUPP',
          })),
        }),
      };
    });

    const result = await fetchPurchaseOrders({ supplierAccount: null, top: 50, skip: 0, fetchAll: true, maxItems: 100 });
    const poCalls = calls.filter((url) => url.includes('/data/PurchaseOrderHeadersV2'));

    expect(result.items).toHaveLength(100);
    expect(result.total).toBe(120);
    expect(result.truncated).toBe(true);
    expect(result.fetchedAll).toBe(false);
    expect(poCalls).toHaveLength(2);
    expect(new URL(poCalls[1]).searchParams.get('$skip')).toBe('50');
  });

  describe('writeBackField (#134)', () => {
    it('schrijft een veld terug met PATCH + If-Match bij ongewijzigde waarde', async () => {
      const calls = [];
      global.fetch = vi.fn(async (url, options) => {
        calls.push({ url: String(url), method: options.method, headers: options.headers, body: options.body });
        if (options.method === 'GET') {
          return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ PurchaseOrderName: 'oud', '@odata.etag': 'W/"123"' }) };
        }
        return { ok: true, status: 204, headers: { get: () => null }, text: async () => '' };
      });

      const res = await writeBackField({
        level: 'header', dataAreaId: 'WHSL', orderNumber: 'PO-1',
        d365Field: 'PurchaseOrderName', newValue: 'nieuw', basedOnValue: 'oud',
      });

      expect(res.ok).toBe(true);
      const patch = calls.find((c) => c.method === 'PATCH');
      expect(patch.headers['If-Match']).toBe('W/"123"');
      expect(JSON.parse(patch.body)).toEqual({ PurchaseOrderName: 'nieuw' });
      expect(patch.url).toContain("PurchaseOrderNumber='PO-1'");
      expect(patch.url).toContain('cross-company=true');
    });

    it('accepteert equivalente datumformats bij optimistic concurrency', async () => {
      const calls = [];
      global.fetch = vi.fn(async (url, options) => {
        calls.push({ url: String(url), method: options.method, body: options.body });
        if (options.method === 'GET') {
          return {
            ok: true,
            status: 200,
            headers: { get: () => null },
            json: async () => ({ RequestedDeliveryDate: '2024-04-12T12:00:00+00:00', '@odata.etag': 'W/"date-1"' }),
          };
        }
        return { ok: true, status: 204, headers: { get: () => null }, text: async () => '' };
      });

      await expect(writeBackField({
        level: 'header',
        dataAreaId: 'WHSL',
        orderNumber: 'PO-1',
        d365Field: 'RequestedDeliveryDate',
        dataType: 'date',
        newValue: '2024-04-19',
        basedOnValue: '2024-04-12T12:00:00.000Z',
      })).resolves.toMatchObject({ ok: true });

      const patch = calls.find((c) => c.method === 'PATCH');
      expect(patch).toBeTruthy();
      expect(JSON.parse(patch.body)).toEqual({ RequestedDeliveryDate: '2024-04-19' });
    });

    it('vergelijkt date-kolommen op kalenderdatum i.p.v. tijdcomponent', async () => {
      global.fetch = vi.fn(async (_url, options) => {
        if (options.method === 'GET') {
          return {
            ok: true,
            status: 200,
            headers: { get: () => null },
            json: async () => ({ RequestedDeliveryDate: '2024-04-19T12:00:00Z', '@odata.etag': 'W/"date-2"' }),
          };
        }
        return { ok: true, status: 204, headers: { get: () => null }, text: async () => '' };
      });

      await expect(writeBackField({
        level: 'header',
        dataAreaId: 'WHSL',
        orderNumber: 'PO-1',
        d365Field: 'RequestedDeliveryDate',
        dataType: 'date',
        newValue: '2024-04-20',
        basedOnValue: '2024-04-19',
      })).resolves.toMatchObject({ ok: true });
    });

    it('weigert (409) als de huidige D365-waarde afwijkt van wat de gebruiker zag', async () => {
      global.fetch = vi.fn(async () => ({
        ok: true, status: 200, headers: { get: () => null },
        json: async () => ({ PurchaseOrderName: 'door-iemand-anders-gewijzigd' }),
      }));

      await expect(writeBackField({
        level: 'header', dataAreaId: 'WHSL', orderNumber: 'PO-1',
        d365Field: 'PurchaseOrderName', newValue: 'x', basedOnValue: 'oud',
      })).rejects.toMatchObject({ status: 409 });
    });

    it('gebruikt de regel-entiteit + LineNumber-sleutel op regelniveau', async () => {
      const calls = [];
      global.fetch = vi.fn(async (url, options) => {
        calls.push({ url: String(url), method: options.method });
        if (options.method === 'GET') {
          return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ LineDescription: 'oud' }) };
        }
        return { ok: true, status: 204, headers: { get: () => null }, text: async () => '' };
      });

      await writeBackField({
        level: 'line', dataAreaId: 'WHSL', orderNumber: 'PO-1', lineNumber: 2,
        d365Field: 'LineDescription', newValue: 'nieuw', basedOnValue: 'oud',
      });

      expect(calls[0].url).toContain('/data/PurchaseOrderLinesV2(');
      expect(calls[0].url).toContain('LineNumber=2');
    });
  });
});
