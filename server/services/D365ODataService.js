'use strict';

const { logger } = require('../utils/logger');
const settingsService = require('./SettingsService');

const DEFAULT_PURCHASE_ORDERS_PATH = '/data/PurchaseOrderHeadersV2';
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

async function buildHeaders() {
  const headers = { Accept: 'application/json' };
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

async function fetchPurchaseOrders({ supplierAccount, top = 50, skip = 0 }) {
  const url = await buildPurchaseOrderUrl({ supplierAccount, top, skip });
  const timeoutRaw = await settingsService.getAsync('D365_ODATA_TIMEOUT_MS', String(DEFAULT_REQUEST_TIMEOUT_MS));
  const timeoutMs = Number.parseInt(timeoutRaw, 10);
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_REQUEST_TIMEOUT_MS;
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

  const payload = await response.json();
  const records = Array.isArray(payload.value) ? payload.value : [];

  return {
    total: records.length,
    items: records.map(mapPurchaseOrder),
  };
}

module.exports = {
  fetchPurchaseOrders,
  mapPurchaseOrder,
  buildPurchaseOrderUrl,
  escapeODataLiteral,
};
