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
    // Echte property op PurchaseOrderLineV2 (geverifieerd via $metadata) is RequestedDeliveryDate;
    // RequestedReceiptDate bestaat niet op deze entiteit (#131-2).
    requestedDeliveryDate: record.RequestedDeliveryDate || record.RequestedReceiptDate || null,
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

async function buildPurchaseOrderUrl({ supplierAccount, top, skip, extraFilter = '' }) {
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

  // Filterclausules opbouwen en met 'and' samenvoegen, zodat een optionele scope-filter
  // (B2: begrenst de cache-sync) bij elke combinatie van company/supplier werkt.
  const clauses = [];
  if (company) clauses.push("dataAreaId eq '" + escapeODataLiteral(company) + "'");
  if (supplierAccount) clauses.push("OrderVendorAccountNumber eq '" + escapeODataLiteral(supplierAccount) + "'");
  const trimmedExtra = String(extraFilter || '').trim();
  if (trimmedExtra) clauses.push('(' + trimmedExtra + ')');

  if (company) searchParams.set('cross-company', 'true');
  if (clauses.length) searchParams.set('$filter', clauses.join(' and '));

  return url.toString();
}

// Standaard regel-entiteit voor write-back op regelniveau (geverifieerd via $metadata).
const DEFAULT_PURCHASE_ORDER_LINES_PATH = '/data/PurchaseOrderLinesV2';

async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    const err = new Error('D365 OData is niet bereikbaar');
    err.status = error && error.name === 'AbortError' ? 504 : 502;
    throw err;
  } finally {
    clearTimeout(handle);
  }
}

// Bouwt de OData-sleutel-URL voor één entiteit, bv.
// .../PurchaseOrderHeadersV2(dataAreaId='WHSL',PurchaseOrderNumber='WSPO-1')
function buildEntityKeyUrl(baseUrl, entityPath, keyParts) {
  const normalizedPath = entityPath.startsWith('/') ? entityPath : '/' + entityPath;
  const keyStr = keyParts
    .map(({ name, value, quote }) => (quote ? `${name}='${escapeODataLiteral(value)}'` : `${name}=${value}`))
    .join(',');
  return baseUrl + normalizedPath + '(' + keyStr + ')';
}

function normalizeComparableValue(value, { dateOnly = false } = {}) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return `bool:${value ? '1' : '0'}`;
  if (typeof value === 'number') return Number.isFinite(value) ? `num:${value}` : 'num:NaN';

  const str = String(value).trim();
  if (!str) return '';

  const isoLike = str.match(
    /^(\d{4}-\d{2}-\d{2})(?:[Tt ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/
  );
  if (isoLike) {
    const datePart = isoLike[1];
    if (dateOnly) return `date:${datePart}`;
    const hh = isoLike[2];
    if (!hh) return `date:${datePart}`;
    const mm = isoLike[3];
    const ss = isoLike[4] || '00';
    return `datetime:${datePart}T${hh}:${mm}:${ss}`;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (Number.isFinite(num)) return `num:${num}`;
  }

  return `text:${str}`;
}

function valuesEqualForConcurrency(currentValue, basedOnValue, dataType) {
  const dateOnly = String(dataType || '').toLowerCase() === 'date';
  return normalizeComparableValue(currentValue, { dateOnly })
    === normalizeComparableValue(basedOnValue, { dateOnly });
}

/**
 * Schrijft één veld terug naar D365 met optimistic concurrency:
 *  1) GET de entiteit → huidige waarde + @odata.etag.
 *  2) Conflict (409) als de huidige waarde afwijkt van basedOnValue (iemand anders wijzigde 'm).
 *  3) PATCH met If-Match (etag of '*'); 412 → conflict.
 * Alleen het PATCH-pad (vrij veld). Boekingsacties (bound Actions) vallen buiten deze fase.
 */
async function writeBackField({ level, dataAreaId, orderNumber, lineNumber, d365Field, newValue, basedOnValue, dataType }) {
  if (!d365Field) {
    const err = new Error('Geen D365-veld opgegeven'); err.status = 400; throw err;
  }
  const baseUrl = await getBaseUrl();
  const headerPath = (await settingsService.getAsync('D365_ODATA_PURCHASE_ORDERS_PATH', DEFAULT_PURCHASE_ORDERS_PATH)).trim();
  const timeoutRaw = await settingsService.getAsync('D365_ODATA_TIMEOUT_MS', String(DEFAULT_REQUEST_TIMEOUT_MS));
  const timeout = Number.parseInt(timeoutRaw, 10) || DEFAULT_REQUEST_TIMEOUT_MS;

  const isLine = level === 'line';
  const entityPath = isLine ? DEFAULT_PURCHASE_ORDER_LINES_PATH : headerPath;
  const keyParts = [
    { name: 'dataAreaId', value: dataAreaId, quote: true },
    { name: 'PurchaseOrderNumber', value: orderNumber, quote: true },
  ];
  if (isLine) keyParts.push({ name: 'LineNumber', value: Number(lineNumber), quote: false });
  const entityUrl = buildEntityKeyUrl(baseUrl, entityPath, keyParts) + '?cross-company=true';

  // 1) GET huidige waarde + etag
  const getRes = await fetchWithTimeout(entityUrl, { method: 'GET', headers: await buildHeaders() }, timeout);
  if (getRes.status === 404) { const e = new Error('Record niet gevonden in D365'); e.status = 404; throw e; }
  if (!getRes.ok) { const e = new Error('Kon D365-record niet lezen'); e.status = 502; throw e; }
  const current = await getRes.json();
  const etag = current['@odata.etag'] || getRes.headers.get('ETag') || null;

  // 2) concurrency-check op de waarde die de gebruiker zag
  if (!valuesEqualForConcurrency(current[d365Field], basedOnValue, dataType)) {
    const e = new Error('De waarde is in D365 gewijzigd sinds u las. Ververs eerst en probeer opnieuw.');
    e.status = 409; throw e;
  }

  // 3) PATCH met If-Match
  const patchHeaders = { ...(await buildHeaders()), 'Content-Type': 'application/json', 'If-Match': etag || '*' };
  const patchRes = await fetchWithTimeout(
    entityUrl,
    { method: 'PATCH', headers: patchHeaders, body: JSON.stringify({ [d365Field]: newValue }) },
    timeout,
  );
  if (patchRes.status === 412) {
    const e = new Error('Conflict: het record is net gewijzigd in D365. Ververs eerst.'); e.status = 409; throw e;
  }
  if (!patchRes.ok) {
    const body = await patchRes.text().catch(() => '');
    logger.error('D365 write-back PATCH mislukt', { status: patchRes.status, bodyPreview: body.slice(0, 300) });
    const e = new Error('Terugschrijven naar D365 mislukt'); e.status = 502; throw e;
  }
  return { ok: true };
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

function buildManualNextPageUrl(currentUrl, pageSize, effectiveMax, fetchedCount, totalCount) {
  if (!pageSize || totalCount === null || fetchedCount >= Math.min(totalCount, effectiveMax)) {
    return null;
  }
  const url = new URL(currentUrl);
  const currentSkip = Number.parseInt(url.searchParams.get('$skip') || '0', 10) || 0;
  const currentTop = Number.parseInt(url.searchParams.get('$top') || String(pageSize), 10) || pageSize;
  const remaining = Math.min(totalCount, effectiveMax) - fetchedCount;
  url.searchParams.set('$skip', String(currentSkip + pageSize));
  url.searchParams.set('$top', String(Math.min(currentTop, remaining)));
  return url.toString();
}

async function fetchPurchaseOrderRecords({
  supplierAccount,
  top,
  skip,
  timeout,
  fetchAll,
  extraFilter = '',
  maxItems = MAX_PURCHASE_ORDER_ITEMS,
  onProgress,
}) {
  const records = [];
  let total = null;
  let pagesFetched = 0;
  let hasMore = false;
  let truncated = false;
  // Harde bovengrens: nooit meer dan de geconfigureerde cap (en nooit boven de absolute MAX).
  const effectiveMax = Number.isFinite(maxItems) && maxItems > 0
    ? Math.min(maxItems, MAX_PURCHASE_ORDER_ITEMS)
    : MAX_PURCHASE_ORDER_ITEMS;
  const initialTop = fetchAll ? Math.min(top, effectiveMax) : top;
  let currentUrl = await buildPurchaseOrderUrl({ supplierAccount, top: initialTop, skip, extraFilter });
  const emitProgress = (isTruncated = false) => {
    if (typeof onProgress !== 'function') return;
    onProgress({
      fetched: records.length,
      totalToFetch: total === null ? null : Math.min(total, effectiveMax),
      sourceTotal: total,
      pagesFetched,
      truncated: isTruncated,
    });
  };

  while (currentUrl) {
    const payload = await fetchODataJson(currentUrl, timeout);
    const pageRecords = Array.isArray(payload.value) ? payload.value : [];
    if (total === null) {
      const parsedTotal = Number.parseInt(payload['@odata.count'], 10);
      if (Number.isFinite(parsedTotal)) {
        total = parsedTotal;
      }
    }
    const remaining = fetchAll ? Math.max(effectiveMax - records.length, 0) : pageRecords.length;
    const recordsToAdd = pageRecords.slice(0, remaining);
    pagesFetched += 1;

    for (const record of recordsToAdd) {
      records.push(record);
      // Update the shared progress counter per fetched row.
      emitProgress(false);
    }

    const serverNextLink = resolveNextLink(payload['@odata.nextLink'], currentUrl);
    const manualNextLink = fetchAll && !serverNextLink
      ? buildManualNextPageUrl(currentUrl, pageRecords.length, effectiveMax, records.length, total)
      : null;
    const nextLink = serverNextLink || manualNextLink;
    const hitItemCap = fetchAll
      && records.length >= effectiveMax
      && (pageRecords.length > recordsToAdd.length || Boolean(nextLink) || (total !== null && records.length < total));
    emitProgress(hitItemCap);

    if (!fetchAll || !nextLink) {
      currentUrl = null;
      hasMore = Boolean(nextLink) || hitItemCap;
      truncated = hitItemCap;
      break;
    }

    if (pagesFetched >= MAX_PURCHASE_ORDER_PAGES || hitItemCap) {
      currentUrl = null;
      hasMore = true;
      truncated = true;
      emitProgress(true);
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

async function fetchPurchaseOrders({
  supplierAccount,
  top = 50,
  skip = 0,
  fetchAll = false,
  extraFilter = '',
  maxItems,
  onProgress,
}) {
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
    extraFilter,
    maxItems,
    onProgress,
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
  writeBackField,
  __resetOAuthTokenCache,
};
