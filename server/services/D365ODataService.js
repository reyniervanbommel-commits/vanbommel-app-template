'use strict';

const { logger } = require('../utils/logger');
const settingsService = require('./SettingsService');

const DEFAULT_PURCHASE_ORDERS_PATH = '/data/PurchaseOrderHeadersV2';
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const MAX_PURCHASE_ORDER_PAGES = 100;
const MAX_PURCHASE_ORDER_ITEMS = 10000;
// Ververs het token ruim vóór de echte expiry, zodat een lopende request niet halverwege verloopt.
const TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_TOKEN_TTL_SEC = 3600;

// In-memory token-cache. _tokenInflight voorkomt dat parallelle requests elk een token ophalen.
let _tokenCache = { accessToken: null, expiresAt: 0 };
let _tokenInflight = null;

async function getOAuthConfig() {
  const [tenantId, clientId, clientSecret] = await Promise.all([
    settingsService.getAsync('D365_ODATA_TENANT_ID'),
    settingsService.getAsync('D365_ODATA_CLIENT_ID'),
    settingsService.getAsync('D365_ODATA_CLIENT_SECRET'),
  ]);
  return {
    tenantId: (tenantId || '').trim(),
    clientId: (clientId || '').trim(),
    clientSecret: (clientSecret || '').trim(),
  };
}

async function requestAccessToken({ tenantId, clientId, clientSecret }) {
  const baseUrl = await getBaseUrl();
  // F&O verwacht de environment-URL als resource: scope = <base>/.default
  const scope = baseUrl + '/.default';
  const tokenUrl = 'https://login.microsoftonline.com/' + encodeURIComponent(tenantId) + '/oauth2/v2.0/token';
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  });

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
  } catch (error) {
    const err = new Error('Azure AD token-endpoint niet bereikbaar');
    err.status = error && error.name === 'AbortError' ? 504 : 502;
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '');
    logger.error('Ophalen D365 OAuth-token mislukt', {
      status: response.status,
      bodyPreview: responseBody.slice(0, 300),
    });
    const err = new Error('Kon geen D365-toegangstoken ophalen');
    err.status = 502;
    throw err;
  }

  const payload = await response.json();
  if (!payload.access_token) {
    const err = new Error('D365 OAuth-respons bevat geen access_token');
    err.status = 502;
    throw err;
  }
  const expiresInSec = Number.parseInt(payload.expires_in, 10);
  const ttlMs = (Number.isFinite(expiresInSec) ? expiresInSec : DEFAULT_TOKEN_TTL_SEC) * 1000;
  return { accessToken: payload.access_token, expiresAt: Date.now() + ttlMs };
}

/**
 * Geeft een geldig access token via de client-credentials flow, of null als er
 * geen client-credentials geconfigureerd zijn (dan valt buildHeaders terug op het statische token).
 */
async function getAccessToken() {
  const config = await getOAuthConfig();
  if (!config.tenantId || !config.clientId || !config.clientSecret) {
    return null;
  }

  if (_tokenCache.accessToken && Date.now() < _tokenCache.expiresAt - TOKEN_REFRESH_SKEW_MS) {
    return _tokenCache.accessToken;
  }

  if (!_tokenInflight) {
    _tokenInflight = requestAccessToken(config)
      .then((result) => {
        _tokenCache = result;
        return result.accessToken;
      })
      .finally(() => {
        _tokenInflight = null;
      });
  }
  return _tokenInflight;
}

function __resetOAuthTokenCache() {
  _tokenCache = { accessToken: null, expiresAt: 0 };
  _tokenInflight = null;
}

async function buildHeaders() {
  const headers = { Accept: 'application/json' };

  const accessToken = await getAccessToken();
  if (accessToken) {
    headers.Authorization = 'Bearer ' + accessToken;
    return headers;
  }

  // Legacy fallback: handmatig geplakt token (verloopt ~1u).
  const bearerToken = await settingsService.getAsync('D365_ODATA_BEARER_TOKEN');
  if (bearerToken) {
    headers.Authorization = 'Bearer ' + bearerToken;
  }
  return headers;
}

async function getBaseUrl() {
  const rawBaseUrl = (await settingsService.getAsync('D365_ODATA_BASE_URL')).trim();
  if (!rawBaseUrl) {
    const err = new Error('D365_ODATA_BASE_URL ontbreekt');
    err.status = 500;
    throw err;
  }
  return rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
}

function mapPurchaseOrder(record) {
  return {
    id: record.PurchaseOrderNumber || record.PurchaseOrderId || record.RecId || null,
    orderNumber: record.PurchaseOrderNumber || record.PurchId || null,
    vendorAccount: record.OrderVendorAccountNumber || record.InvoiceVendorAccountNumber || record.VendorAccountNumber || null,
    vendorName: record.PurchaseOrderName || record.VendorName || null,
    status: record.PurchaseOrderStatus || record.DocumentStatus || null,
    currencyCode: record.CurrencyCode || null,
    requestedDeliveryDate: record.RequestedDeliveryDate || record.RequestedDeliveryDateTime || null,
    createdDateTime: record.CreatedDateTime || record.AccountingDate || null,
    raw: record,
  };
}

function mapPurchaseOrderLine(record) {
  return {
    purchaseOrderNumber: record.PurchaseOrderNumber || null,
    lineNumber: record.LineNumber ?? null,
    itemNumber: record.ItemNumber || null,
    description: record.LineDescription || null,
    quantity: record.OrderedPurchaseQuantity ?? null,
    unit: record.PurchaseUnitSymbol || null,
    lineAmount: record.LineAmount ?? null,
    currencyCode: record.CurrencyCode || null,
    requestedDeliveryDate: record.RequestedReceiptDate || null,
    raw: record,
  };
}

function mapVendor(record) {
  return {
    accountNumber: record.VendorAccountNumber || null,
    name: record.VendorOrganizationName || null,
    email: record.PrimaryContactEmail || null,
    phone: record.PrimaryContactPhone || null,
    vendorGroup: record.VendorGroupId || null,
    currencyCode: record.CurrencyCode || null,
    raw: record,
  };
}

function escapeODataLiteral(value) {
  return String(value || '').replace(/'/g, "''");
}

async function buildPurchaseOrderUrl({ supplierAccount, top, skip }) {
  const baseUrl = await getBaseUrl();
  const path = (await settingsService.getAsync('D365_ODATA_PURCHASE_ORDERS_PATH', DEFAULT_PURCHASE_ORDERS_PATH)).trim();
  const company = (await settingsService.getAsync('D365_ODATA_COMPANY')).trim();
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  const url = new URL(baseUrl + normalizedPath);
  const searchParams = url.searchParams;

  searchParams.set('$top', String(top));
  searchParams.set('$skip', String(skip));
  searchParams.set('$count', 'true');
  searchParams.set('$expand', 'PurchaseOrderLines');

  const safeSupplierAccount = escapeODataLiteral(supplierAccount);
  const safeCompany = escapeODataLiteral(company);

  if (company && supplierAccount) {
    searchParams.set('cross-company', 'true');
    searchParams.set('$filter', "dataAreaId eq '" + safeCompany + "' and OrderVendorAccountNumber eq '" + safeSupplierAccount + "'");
  } else if (company) {
    searchParams.set('cross-company', 'true');
    searchParams.set('$filter', "dataAreaId eq '" + safeCompany + "'");
  } else if (supplierAccount) {
    searchParams.set('$filter', "OrderVendorAccountNumber eq '" + safeSupplierAccount + "'");
  }

  return url.toString();
}

async function fetchODataJson(url, timeout) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: await buildHeaders(),
      signal: controller.signal,
    });
  } catch (error) {
    const err = new Error('D365 OData is niet bereikbaar');
    err.status = error && error.name === 'AbortError' ? 504 : 502;
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '');
    logger.error('D365 OData request mislukt', {
      status: response.status,
      url,
      bodyPreview: responseBody.slice(0, 300),
    });

    const err = new Error('D365 OData verzoek mislukt');
    err.status = 502;
    throw err;
  }

  return response.json();
}

async function fetchVendorsByAccounts(vendorAccounts, timeout) {
  if (!vendorAccounts.length) return {};

  const baseUrl = await getBaseUrl();
  const company = (await settingsService.getAsync('D365_ODATA_COMPANY')).trim();
  const url = new URL(baseUrl + '/data/VendorsV2');
  const searchParams = url.searchParams;

  searchParams.set('$top', String(Math.max(vendorAccounts.length, 1)));
  searchParams.set('$count', 'false');

  const accountFilter = vendorAccounts
    .map((account) => "VendorAccountNumber eq '" + escapeODataLiteral(account) + "'")
    .join(' or ');

  if (company && accountFilter) {
    searchParams.set('cross-company', 'true');
    searchParams.set('$filter', "dataAreaId eq '" + escapeODataLiteral(company) + "' and (" + accountFilter + ')');
  } else if (accountFilter) {
    searchParams.set('$filter', accountFilter);
  }

  const payload = await fetchODataJson(url.toString(), timeout);
  const records = Array.isArray(payload.value) ? payload.value : [];

  return records.reduce((acc, record) => {
    const vendor = mapVendor(record);
    if (vendor.accountNumber) {
      acc[vendor.accountNumber] = vendor;
    }
    return acc;
  }, {});
}

function resolveNextLink(nextLink, baseUrl) {
  if (!nextLink) {
    return null;
  }

  try {
    return new URL(nextLink, baseUrl).toString();
  } catch {
    return null;
  }
}

async function fetchPurchaseOrderRecords({ supplierAccount, top, skip, timeout, fetchAll }) {
  let currentUrl = await buildPurchaseOrderUrl({ supplierAccount, top, skip });
  const records = [];
  let total = null;
  let pagesFetched = 0;
  let hasMore = false;
  let truncated = false;

  while (currentUrl) {
    const payload = await fetchODataJson(currentUrl, timeout);
    const pageRecords = Array.isArray(payload.value) ? payload.value : [];
    records.push(...pageRecords);
    pagesFetched += 1;

    if (total === null) {
      const parsedTotal = Number.parseInt(payload['@odata.count'], 10);
      if (Number.isFinite(parsedTotal)) {
        total = parsedTotal;
      }
    }

    const nextLink = resolveNextLink(payload['@odata.nextLink'], currentUrl);
    if (!fetchAll || !nextLink) {
      currentUrl = null;
      hasMore = Boolean(nextLink);
      break;
    }

    if (pagesFetched >= MAX_PURCHASE_ORDER_PAGES || records.length >= MAX_PURCHASE_ORDER_ITEMS) {
      currentUrl = null;
      hasMore = true;
      truncated = true;
      break;
    }

    currentUrl = nextLink;
  }

  return {
    records,
    total: total ?? records.length,
    hasMore,
    truncated,
    pagesFetched,
    fetchedAll: fetchAll ? !hasMore : false,
  };
}

async function fetchPurchaseOrders({ supplierAccount, top = 50, skip = 0, fetchAll = false }) {
  const timeoutRaw = await settingsService.getAsync('D365_ODATA_TIMEOUT_MS', String(DEFAULT_REQUEST_TIMEOUT_MS));
  const timeoutMs = Number.parseInt(timeoutRaw, 10);
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_REQUEST_TIMEOUT_MS;
  const {
    records,
    total,
    hasMore,
    truncated,
    pagesFetched,
    fetchedAll,
  } = await fetchPurchaseOrderRecords({
    supplierAccount,
    top,
    skip,
    timeout,
    fetchAll,
  });
  const vendorAccounts = Array.from(new Set(
    records
      .map((record) => record.OrderVendorAccountNumber || record.InvoiceVendorAccountNumber || record.VendorAccountNumber)
      .filter(Boolean)
  ));
  const vendorsByAccount = await fetchVendorsByAccounts(vendorAccounts, timeout);

  const items = records.map((record) => {
    const mappedOrder = mapPurchaseOrder(record);
    const lines = Array.isArray(record.PurchaseOrderLines)
      ? record.PurchaseOrderLines.map(mapPurchaseOrderLine)
      : [];
    const vendor = mappedOrder.vendorAccount ? vendorsByAccount[mappedOrder.vendorAccount] || null : null;

    return {
      ...mappedOrder,
      vendorName: mappedOrder.vendorName || vendor?.name || null,
      vendorGroup: vendor?.vendorGroup || null,
      vendorEmail: vendor?.email || null,
      vendorPhone: vendor?.phone || null,
      vendor,
      lines,
      lineCount: lines.length,
    };
  });

  return {
    total,
    items,
    hasMore,
    truncated,
    pagesFetched,
    fetchedAll,
  };
}

module.exports = {
  fetchPurchaseOrders,
  mapPurchaseOrder,
  mapPurchaseOrderLine,
  mapVendor,
  buildPurchaseOrderUrl,
  escapeODataLiteral,
  getAccessToken,
  __resetOAuthTokenCache,
};
