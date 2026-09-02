'use strict';

const { logger } = require('../utils/logger');
const settingsService = require('./SettingsService');
const { listSelectFieldsMissingFromRecord } = require('../utils/discoverSourceColumns');

const DEFAULT_PURCHASE_ORDERS_PATH = '/data/PurchaseOrderHeadersV2';
const DEFAULT_RELEASED_PRODUCT_DOCUMENT_ATTACHMENTS_PATH = '/data/ReleasedProductDocumentAttachments';
const DEFAULT_PRODUCT_DOCUMENT_ATTACHMENTS_PATH = '/data/ProductDocumentAttachments';
const DEFAULT_VENDORS_PATH = '/data/VendorsV2';
const DEFAULT_RELEASED_PRODUCTS_PATH = '/data/ReleasedProductsV2';
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
    const err = new Error('Azure AD token endpoint unreachable');
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
    const err = new Error('Could not obtain D365 access token');
    err.status = 502;
    throw err;
  }

  const payload = await response.json();
  if (!payload.access_token) {
    const err = new Error('D365 OAuth response does not contain access_token');
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
    const err = new Error('D365_ODATA_BASE_URL is missing');
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

function mapReleasedProduct(record) {
  return {
    itemNumber: record.ItemNumber || null,
    searchName: record.SearchName || record.ProductSearchName || null,
    productSearchName: record.ProductSearchName || null,
    productName: record.ProductName || null,
    itemGroupId: record.ItemGroupId || null,
    unitSymbol: record.ProductDefaultOrderUnitSymbol || null,
    raw: record,
  };
}

function escapeODataLiteral(value) {
  return String(value || '').replace(/'/g, "''");
}

async function buildPurchaseOrderUrl({
  supplierAccount,
  top,
  skip,
  extraFilter = '',
  selectFields = null,
  lineSelectFields = null,
}) {
  const baseUrl = await getBaseUrl();
  const path = (await settingsService.getAsync('D365_ODATA_PURCHASE_ORDERS_PATH', DEFAULT_PURCHASE_ORDERS_PATH)).trim();
  const company = (await settingsService.getAsync('D365_ODATA_COMPANY')).trim();
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  const url = new URL(baseUrl + normalizedPath);
  const searchParams = url.searchParams;

  searchParams.set('$top', String(top));
  searchParams.set('$skip', String(skip));
  searchParams.set('$count', 'true');

  // $expand van de regels, optioneel met een genest $select zodat alleen de geconfigureerde
  // regel-velden over de lijn komen. Zonder lijst blijft het gedrag ongewijzigd (alle regelvelden).
  const hasLineSelect = Array.isArray(lineSelectFields) && lineSelectFields.length > 0;
  searchParams.set(
    '$expand',
    hasLineSelect ? `PurchaseOrderLines($select=${lineSelectFields.join(',')})` : 'PurchaseOrderLines',
  );

  // $select op kopniveau: alleen de geconfigureerde bron-velden ophalen i.p.v. de volledige entiteit.
  // Zonder lijst geen $select (bootstrap/legacy: alles ophalen, zodat veld-discovery kan werken).
  if (Array.isArray(selectFields) && selectFields.length > 0) {
    searchParams.set('$select', selectFields.join(','));
  }

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
    const err = new Error('D365 OData is unreachable');
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
    const err = new Error('No D365 field specified'); err.status = 400; throw err;
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
  if (getRes.status === 404) { const e = new Error('Record not found in D365'); e.status = 404; throw e; }
  if (!getRes.ok) { const e = new Error('Could not read D365 record'); e.status = 502; throw e; }
  const current = await getRes.json();
  const etag = current['@odata.etag'] || getRes.headers.get('ETag') || null;

  // 2) concurrency-check op de waarde die de gebruiker zag
  if (!valuesEqualForConcurrency(current[d365Field], basedOnValue, dataType)) {
    const e = new Error('The value changed in D365 since you read it. Refresh first and try again.');
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
    const e = new Error('Conflict: the record was just changed in D365. Refresh first.'); e.status = 409; throw e;
  }
  if (!patchRes.ok) {
    const body = await patchRes.text().catch(() => '');
    logger.error('D365 write-back PATCH mislukt', { status: patchRes.status, bodyPreview: body.slice(0, 300) });
    const PATCH_FAILURE_STATUS_WHITELIST = new Set([400, 404, 409, 422, 423]);
    const message = summarizeODataFailure(patchRes.status, entityUrl, body);
    const e = new Error(message);
    e.status = PATCH_FAILURE_STATUS_WHITELIST.has(patchRes.status) ? patchRes.status : 502;
    throw e;
  }
  return { ok: true };
}

function odataErrorDetail(parsed) {
  const inner = parsed?.error?.innererror?.message
    || parsed?.error?.innererror?.internalexception?.message;
  const message = parsed?.error?.message;
  const outer = typeof message === 'string' ? message : String(message?.value || '');
  const generic = !outer || /^an error has occurred\.?$/i.test(outer.trim());
  if (inner && generic) return String(inner);
  return outer || (inner ? String(inner) : '');
}

function parseMissingODataProperty(detail) {
  const match = String(detail || '').match(/Could not find a property named '([^']+)'/i);
  return match ? match[1] : null;
}

function summarizeODataFailure(status, url, body) {
  let detail = '';
  const raw = String(body || '').trim();
  if (raw) {
    try {
      detail = odataErrorDetail(JSON.parse(raw));
    } catch {
      detail = raw;
    }
  }
  detail = detail.replace(/\s+/g, ' ').trim().slice(0, 400);
  let path = '';
  try {
    path = new URL(url).pathname;
  } catch {
    path = '';
  }
  return [`D365 OData request failed (${status})`, path, detail].filter(Boolean).join(': ');
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
    const err = new Error('D365 OData is unreachable');
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

    const summary = summarizeODataFailure(response.status, url, responseBody);
    const err = new Error(summary);
    err.status = response.status || 502;
    err.missingProperty = parseMissingODataProperty(summary);
    throw err;
  }

  return response.json();
}

async function fetchVendorsByAccounts(vendorAccounts, timeout) {
  if (!vendorAccounts.length) return {};

  const baseUrl = await getBaseUrl();
  const company = (await settingsService.getAsync('D365_ODATA_COMPANY')).trim();
  const url = new URL(baseUrl + DEFAULT_VENDORS_PATH);
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

async function fetchVendorAccountsByGroups(groupIds) {
  const groups = [...new Set((Array.isArray(groupIds) ? groupIds : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean))];
  if (!groups.length) return [];
  const extraFilter = groups.length === 1
    ? `VendorGroupId eq '${escapeODataLiteral(groups[0])}'`
    : `(${groups.map((id) => `VendorGroupId eq '${escapeODataLiteral(id)}'`).join(' or ')})`;
  const result = await fetchEntityRecords({
    sourceEntity: DEFAULT_VENDORS_PATH,
    fetchAll: true,
    extraFilter,
    selectFields: ['VendorAccountNumber', 'VendorGroupId', 'dataAreaId'],
    maxItems: 5000,
  });
  return [...new Set((Array.isArray(result.items) ? result.items : [])
    .map((record) => String(record.VendorAccountNumber || '').trim())
    .filter(Boolean))];
}

async function buildGenericEntityUrl({
  sourceEntity,
  company,
  top,
  skip,
  extraFilter = '',
  selectFields = null,
  applyCompanyFilter = true,
}) {
  const baseUrl = await getBaseUrl();
  const normalizedPath = String(sourceEntity || '').trim();
  if (!normalizedPath) {
    const err = new Error('sourceEntity is missing for D365 fetch');
    err.status = 400;
    throw err;
  }

  const pathWithSlash = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  const url = new URL(baseUrl + pathWithSlash);
  const searchParams = url.searchParams;

  searchParams.set('$top', String(top));
  searchParams.set('$skip', String(skip));
  searchParams.set('$count', 'true');

  if (Array.isArray(selectFields) && selectFields.length) {
    searchParams.set('$select', selectFields.join(','));
  }

  const clauses = [];
  if (applyCompanyFilter && company) clauses.push(`dataAreaId eq '${escapeODataLiteral(company)}'`);
  const trimmedExtra = String(extraFilter || '').trim();
  if (trimmedExtra) clauses.push(`(${trimmedExtra})`);
  if (clauses.length) searchParams.set('$filter', clauses.join(' and '));
  if (applyCompanyFilter && company) searchParams.set('cross-company', 'true');

  return url.toString();
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

function narrowFieldList(fields, droppedFields) {
  if (!Array.isArray(fields) || !fields.length) return fields;
  const dropped = new Set((droppedFields || []).map((field) => String(field).toLowerCase()));
  if (!dropped.size) return fields;
  return fields.filter((field) => !dropped.has(String(field).toLowerCase()));
}

function listDroppedPoSelectFields(selectFields, lineSelectFields, sampleRecord, missingProperty) {
  const headerDropped = listSelectFieldsMissingFromRecord(selectFields, sampleRecord);
  const firstLine = Array.isArray(sampleRecord?.PurchaseOrderLines) ? sampleRecord.PurchaseOrderLines[0] : null;
  const lineDropped = listSelectFieldsMissingFromRecord(lineSelectFields, firstLine);
  const dropped = [...new Set([...headerDropped, ...lineDropped])];
  const named = String(missingProperty || '').trim();
  if (named && !dropped.some((field) => field.toLowerCase() === named.toLowerCase())) {
    dropped.push(named);
  }
  return dropped;
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
  selectFields = null,
  lineSelectFields = null,
}) {
  const hasSelect = (Array.isArray(selectFields) && selectFields.length > 0)
    || (Array.isArray(lineSelectFields) && lineSelectFields.length > 0);
  const effectiveMax = Number.isFinite(maxItems) && maxItems > 0
    ? Math.min(maxItems, MAX_PURCHASE_ORDER_ITEMS)
    : MAX_PURCHASE_ORDER_ITEMS;

  async function run(activeSelectFields, activeLineSelectFields, { topOverride, fetchAllOverride, skipOverride } = {}) {
    const records = [];
    let total = null;
    let pagesFetched = 0;
    let hasMore = false;
    let truncated = false;
    const shouldFetchAll = fetchAllOverride ?? fetchAll;
    const pageTop = topOverride ?? (shouldFetchAll ? Math.min(top, effectiveMax) : top);
    const pageSkip = skipOverride ?? skip;
    let currentUrl = await buildPurchaseOrderUrl({
      supplierAccount,
      top: pageTop,
      skip: pageSkip,
      extraFilter,
      selectFields: activeSelectFields,
      lineSelectFields: activeLineSelectFields,
    });
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
      const remaining = shouldFetchAll ? Math.max(effectiveMax - records.length, 0) : pageRecords.length;
      const recordsToAdd = pageRecords.slice(0, remaining);
      pagesFetched += 1;

      for (const record of recordsToAdd) {
        records.push(record);
      }

      const serverNextLink = resolveNextLink(payload['@odata.nextLink'], currentUrl);
      const manualNextLink = shouldFetchAll && !serverNextLink
        ? buildManualNextPageUrl(currentUrl, pageRecords.length, effectiveMax, records.length, total)
        : null;
      const nextLink = serverNextLink || manualNextLink;
      const hitItemCap = shouldFetchAll
        && records.length >= effectiveMax
        && (pageRecords.length > recordsToAdd.length || Boolean(nextLink) || (total !== null && records.length < total));
      emitProgress(hitItemCap);

      if (!shouldFetchAll || !nextLink) {
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
      fetchedAll: shouldFetchAll ? !hasMore : false,
    };
  }

  try {
    return await run(selectFields, lineSelectFields);
  } catch (err) {
    if (!hasSelect || Number(err?.status) !== 400) throw err;
    let probe;
    try {
      probe = await run(null, null, { topOverride: 1, fetchAllOverride: false, skipOverride: 0 });
    } catch {
      throw err;
    }
    const sampleRecord = Array.isArray(probe?.records) ? probe.records[0] : null;
    const droppedSelectFields = listDroppedPoSelectFields(
      selectFields,
      lineSelectFields,
      sampleRecord,
      err.missingProperty,
    );
    if (!droppedSelectFields.length) throw err;
    const nextSelect = narrowFieldList(selectFields, droppedSelectFields);
    const nextLineSelect = narrowFieldList(lineSelectFields, droppedSelectFields);
    logger.warn('D365 $select rejected; dropping fields that D365 did not return', {
      sourceEntity: DEFAULT_PURCHASE_ORDERS_PATH,
      droppedSelectFields,
    });
    const result = await run(
      nextSelect && nextSelect.length ? nextSelect : null,
      nextLineSelect && nextLineSelect.length ? nextLineSelect : null,
    );
    return { ...result, droppedSelectFields };
  }
}

async function fetchEntityRecords({
  sourceEntity,
  top = 100,
  skip = 0,
  fetchAll = false,
  extraFilter = '',
  maxItems = MAX_PURCHASE_ORDER_ITEMS,
  onProgress,
  selectFields = null,
  applyCompanyFilter = true,
}) {
  const timeoutRaw = await settingsService.getAsync('D365_ODATA_TIMEOUT_MS', String(DEFAULT_REQUEST_TIMEOUT_MS));
  const timeoutMs = Number.parseInt(timeoutRaw, 10);
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_REQUEST_TIMEOUT_MS;
  const company = (await settingsService.getAsync('D365_ODATA_COMPANY')).trim();
  const effectiveMax = Number.isFinite(maxItems) && maxItems > 0
    ? Math.min(maxItems, MAX_PURCHASE_ORDER_ITEMS)
    : MAX_PURCHASE_ORDER_ITEMS;
  const initialTop = fetchAll ? Math.min(top, effectiveMax) : top;
  const hasSelect = Array.isArray(selectFields) && selectFields.length > 0;

  async function run(activeSelectFields, { topOverride, fetchAllOverride, skipOverride } = {}) {
    const records = [];
    let total = null;
    let pagesFetched = 0;
    let hasMore = false;
    let truncated = false;
    const shouldFetchAll = fetchAllOverride ?? fetchAll;
    const pageTop = topOverride ?? initialTop;
    const pageSkip = skipOverride ?? skip;

    let currentUrl = await buildGenericEntityUrl({
      sourceEntity,
      company,
      top: pageTop,
      skip: pageSkip,
      extraFilter,
      selectFields: activeSelectFields,
      applyCompanyFilter,
    });

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
        if (Number.isFinite(parsedTotal)) total = parsedTotal;
      }

      const remaining = shouldFetchAll ? Math.max(effectiveMax - records.length, 0) : pageRecords.length;
      const recordsToAdd = pageRecords.slice(0, remaining);
      pagesFetched += 1;
      for (const record of recordsToAdd) {
        records.push(record);
      }

      const serverNextLink = resolveNextLink(payload['@odata.nextLink'], currentUrl);
      const manualNextLink = shouldFetchAll && !serverNextLink
        ? buildManualNextPageUrl(currentUrl, pageRecords.length, effectiveMax, records.length, total)
        : null;
      const nextLink = serverNextLink || manualNextLink;
      const hitItemCap = shouldFetchAll
        && records.length >= effectiveMax
        && (pageRecords.length > recordsToAdd.length || Boolean(nextLink) || (total !== null && records.length < total));
      emitProgress(hitItemCap);

      if (!shouldFetchAll || !nextLink) {
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
      total: total ?? records.length,
      items: records,
      hasMore,
      truncated,
      pagesFetched,
      fetchedAll: shouldFetchAll ? !hasMore : false,
    };
  }

  try {
    return await run(selectFields);
  } catch (err) {
    if (!hasSelect || Number(err?.status) !== 400) throw err;
    let probe;
    try {
      probe = await run(null, { topOverride: 1, fetchAllOverride: false, skipOverride: 0 });
    } catch {
      throw err;
    }
    const sampleRecord = Array.isArray(probe?.items) ? probe.items[0] : null;
    const droppedSelectFields = listSelectFieldsMissingFromRecord(selectFields, sampleRecord);
    if (!droppedSelectFields.length) throw err;
    const droppedSet = new Set(droppedSelectFields.map((field) => field.toLowerCase()));
    const nextSelect = selectFields.filter((field) => !droppedSet.has(String(field).toLowerCase()));
    logger.warn('D365 $select rejected; dropping fields that D365 did not return', {
      sourceEntity,
      droppedSelectFields,
    });
    const result = await run(nextSelect.length ? nextSelect : null);
    return { ...result, droppedSelectFields };
  }
}

function buildPurchaseOrderKeysFilter(keys) {
  const list = Array.isArray(keys) ? keys : [];
  const clauses = [];
  const seen = new Set();
  for (const entry of list) {
    const dataAreaId = String(entry?.dataAreaId || '').trim();
    const orderNumber = String(entry?.orderNumber || entry?.recordKey || '').trim();
    if (!dataAreaId || !orderNumber) continue;
    const dedupeKey = `${dataAreaId}|${orderNumber}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    clauses.push(
      `(dataAreaId eq '${escapeODataLiteral(dataAreaId)}' and PurchaseOrderNumber eq '${escapeODataLiteral(orderNumber)}')`
    );
  }
  return clauses.length ? `(${clauses.join(' or ')})` : '';
}

const RETAINED_PO_CHUNK_SIZE = 20;

async function fetchPurchaseOrdersByKeys({
  keys = [],
  selectFields = null,
  lineSelectFields = null,
  maxItems,
  onProgress,
}) {
  const deduped = [];
  const seen = new Set();
  for (const entry of Array.isArray(keys) ? keys : []) {
    const dataAreaId = String(entry?.dataAreaId || entry?.partitionKey || '').trim();
    const orderNumber = String(entry?.orderNumber || entry?.recordKey || '').trim();
    if (!dataAreaId || !orderNumber) continue;
    const dedupeKey = `${dataAreaId}|${orderNumber}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    deduped.push({ dataAreaId, orderNumber });
  }
  if (!deduped.length) {
    return { items: [], total: 0, truncated: false, pagesFetched: 0, fetchedAll: true, droppedSelectFields: [] };
  }

  const timeoutRaw = await settingsService.getAsync('D365_ODATA_TIMEOUT_MS', String(DEFAULT_REQUEST_TIMEOUT_MS));
  const timeoutMs = Number.parseInt(timeoutRaw, 10);
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_REQUEST_TIMEOUT_MS;
  const effectiveMax = Number.isFinite(maxItems) && maxItems > 0
    ? Math.min(maxItems, MAX_PURCHASE_ORDER_ITEMS)
    : MAX_PURCHASE_ORDER_ITEMS;

  const allRecords = [];
  let truncated = false;
  let pagesFetched = 0;
  let droppedSelectFields = [];
  let activeSelectFields = selectFields;
  let activeLineSelectFields = lineSelectFields;

  for (let offset = 0; offset < deduped.length; offset += RETAINED_PO_CHUNK_SIZE) {
    if (allRecords.length >= effectiveMax) {
      truncated = true;
      break;
    }
    const chunk = deduped.slice(offset, offset + RETAINED_PO_CHUNK_SIZE);
    const keysFilter = buildPurchaseOrderKeysFilter(chunk);
    const remaining = Math.max(effectiveMax - allRecords.length, 0);
    const {
      records,
      truncated: chunkTruncated,
      pagesFetched: chunkPages,
      droppedSelectFields: chunkDropped,
    } = await fetchPurchaseOrderRecords({
      supplierAccount: null,
      top: Math.min(remaining, RETAINED_PO_CHUNK_SIZE),
      skip: 0,
      timeout,
      fetchAll: false,
      extraFilter: keysFilter,
      maxItems: remaining,
      onProgress,
      selectFields: activeSelectFields,
      lineSelectFields: activeLineSelectFields,
    });
    if (Array.isArray(chunkDropped) && chunkDropped.length) {
      droppedSelectFields = [...new Set([...droppedSelectFields, ...chunkDropped])];
      activeSelectFields = narrowFieldList(activeSelectFields, droppedSelectFields);
      activeLineSelectFields = narrowFieldList(activeLineSelectFields, droppedSelectFields);
    }
    pagesFetched += Number(chunkPages) || 0;
    allRecords.push(...records);
    if (chunkTruncated || allRecords.length >= effectiveMax) {
      truncated = true;
      break;
    }
  }

  const vendorAccounts = Array.from(new Set(
    allRecords
      .map((record) => record.OrderVendorAccountNumber || record.InvoiceVendorAccountNumber || record.VendorAccountNumber)
      .filter(Boolean)
  ));
  const vendorsByAccount = await fetchVendorsByAccounts(vendorAccounts, timeout);
  const items = allRecords.map((record) => {
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
    total: items.length,
    items,
    hasMore: truncated,
    truncated,
    pagesFetched,
    fetchedAll: !truncated,
    droppedSelectFields,
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
  selectFields = null,
  lineSelectFields = null,
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
    droppedSelectFields,
  } = await fetchPurchaseOrderRecords({
    supplierAccount,
    top,
    skip,
    timeout,
    fetchAll,
    extraFilter,
    maxItems,
    onProgress,
    selectFields,
    lineSelectFields,
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
    droppedSelectFields,
  };
}

/**
 * Readiness-check voor de D365-koppeling.
 *
 * Doet bewust méér dan een token ophalen: op 2026-07-19 bleek bij het inregelen van de
 * LIVE-omgeving dat het token prima slaagde terwijl élke entity-read 403 gaf (de gekoppelde
 * F&O-gebruiker had geen rechten). Een token-only check zou die situatie als 'gezond'
 * rapporteren. Daarom halen we ook echt één record op per kritieke entiteit.
 *
 * Productafbeeldingen lezen primair uit ProductDocumentAttachments (F&O UI product image),
 * met fallback naar ReleasedProductDocumentAttachments — beide worden hier geprobeerd.
 *
 * Gooit nooit; geeft altijd een status terug zodat de caller kan beslissen over de HTTP-code.
 */
async function probeEntityRead(baseUrl, headers, entityPath, { crossCompany = true } = {}) {
  const probeUrl = `${baseUrl}${entityPath}?$top=1${crossCompany ? '&cross-company=true' : ''}`;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(probeUrl, { headers, signal: controller.signal });
    if (response.ok) return { status: 'ok' };
    const body = await response.text().catch(() => '');
    return {
      status: 'fail',
      httpStatus: response.status,
      message: response.status === 403
        ? `Authenticated, but the linked F&O user is not authorized to read ${entityPath}`
        : `D365 returned HTTP ${response.status}`,
      bodyPreview: body.slice(0, 300),
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error.name === 'AbortError' ? 'D365 request timed out' : 'D365 unreachable',
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function checkHealth() {
  const result = {
    status: 'error',
    baseUrl: null,
    company: null,
    token: 'fail',
    read: 'fail',
    productImageRead: 'fail',
    entities: {
      purchaseOrders: 'fail',
      productDocumentAttachments: 'fail',
      releasedProductDocumentAttachments: 'fail',
    },
    message: null,
  };

  try {
    result.baseUrl = await getBaseUrl();
    result.company = (await settingsService.getAsync('D365_ODATA_COMPANY')) || null;
  } catch (error) {
    result.message = error.message;
    return result;
  }

  let headers;
  try {
    headers = await buildHeaders();
    if (!headers.Authorization) {
      result.message = 'No D365 credentials configured';
      return result;
    }
    result.token = 'ok';
  } catch (error) {
    result.message = 'Token request failed: ' + error.message;
    return result;
  }

  const ordersPath = (await settingsService.getAsync('D365_ODATA_PURCHASE_ORDERS_PATH')) || DEFAULT_PURCHASE_ORDERS_PATH;
  const probes = [
    ['purchaseOrders', ordersPath],
    ['productDocumentAttachments', DEFAULT_PRODUCT_DOCUMENT_ATTACHMENTS_PATH],
    ['releasedProductDocumentAttachments', DEFAULT_RELEASED_PRODUCT_DOCUMENT_ATTACHMENTS_PATH],
  ];

  let firstFailure = null;
  for (const [key, entityPath] of probes) {
    const probe = await probeEntityRead(result.baseUrl, headers, entityPath);
    result.entities[key] = probe.status === 'ok' ? 'ok' : 'fail';
    if (probe.status !== 'ok' && !firstFailure) {
      firstFailure = probe;
      logger.error('D365 readiness-check mislukt', {
        entity: entityPath,
        status: probe.httpStatus,
        bodyPreview: probe.bodyPreview,
      });
    }
  }

  result.read = result.entities.purchaseOrders === 'ok' ? 'ok' : 'fail';
  result.productImageRead = (
    result.entities.productDocumentAttachments === 'ok'
    || result.entities.releasedProductDocumentAttachments === 'ok'
  ) ? 'ok' : 'fail';

  if (result.read === 'ok' && result.productImageRead === 'ok') {
    result.status = 'ok';
    return result;
  }

  if (result.read !== 'ok') {
    result.message = firstFailure?.message || 'Purchase order entity is unavailable';
    return result;
  }

  result.status = 'error';
  result.message = 'Purchase orders are readable, but product image entities are unavailable';
  return result;
}

module.exports = {
  checkHealth,
  fetchPurchaseOrders,
  fetchPurchaseOrdersByKeys,
  fetchEntityRecords,
  fetchVendorAccountsByGroups,
  mapPurchaseOrder,
  mapPurchaseOrderLine,
  mapVendor,
  mapReleasedProduct,
  DEFAULT_VENDORS_PATH,
  DEFAULT_RELEASED_PRODUCTS_PATH,
  buildPurchaseOrderUrl,
  buildPurchaseOrderKeysFilter,
  escapeODataLiteral,
  getAccessToken,
  writeBackField,
  summarizeODataFailure,
  __resetOAuthTokenCache,
  RETAINED_PO_CHUNK_SIZE,
};
