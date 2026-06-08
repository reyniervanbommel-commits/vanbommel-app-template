'use strict';

const { logger } = require('../utils/logger');

const DEFAULT_PURCHASE_ORDERS_PATH = '/data/PurchaseOrderHeadersV2';

function buildHeaders() {
  const headers = {
    Accept: 'application/json',
  };

  const bearerToken = process.env.D365_ODATA_BEARER_TOKEN;
  if (bearerToken) {
    headers.Authorization = 'Bearer ' + bearerToken;
  }

  return headers;
}

function getBaseUrl() {
  const rawBaseUrl = (process.env.D365_ODATA_BASE_URL || '').trim();
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
    vendorAccount: record.OrderAccount || record.VendorAccountNumber || record.VendorAccount || null,
    vendorName: record.VendorName || record.OrderAccountName || null,
    status: record.DocumentStatus || record.PurchaseOrderStatus || null,
    currencyCode: record.CurrencyCode || null,
    requestedDeliveryDate: record.RequestedDeliveryDateTime || record.RequestedDeliveryDate || null,
    createdDateTime: record.CreatedDateTime || null,
    raw: record,
  };
}

function buildPurchaseOrderUrl({ supplierAccount, top, skip }) {
  const baseUrl = getBaseUrl();
  const path = (process.env.D365_ODATA_PURCHASE_ORDERS_PATH || DEFAULT_PURCHASE_ORDERS_PATH).trim();
  const company = (process.env.D365_ODATA_COMPANY || '').trim();
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  const url = new URL(baseUrl + normalizedPath);
  const searchParams = url.searchParams;

  searchParams.set('$top', String(top));
  searchParams.set('$skip', String(skip));

  if (company) {
    searchParams.set('cross-company', 'true');
    searchParams.set('$filter', "dataAreaId eq '" + company + "' and OrderAccount eq '" + supplierAccount + "'");
  } else {
    searchParams.set('$filter', "OrderAccount eq '" + supplierAccount + "'");
  }

  return url.toString();
}

async function fetchPurchaseOrders({ supplierAccount, top = 50, skip = 0 }) {
  const url = buildPurchaseOrderUrl({ supplierAccount, top, skip });
  const response = await fetch(url, { method: 'GET', headers: buildHeaders() });

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
};
