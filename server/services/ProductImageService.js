'use strict';

const settingsService = require('./SettingsService');
const { getAccessToken } = require('./D365ODataService');

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const DATA_AREA_ID_PATTERN = /^[A-Za-z0-9]{2,10}$/;
const ITEM_NUMBER_PATTERN = /^[A-Za-z0-9._-]{1,60}$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

class ProductImageServiceError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'ProductImageServiceError';
    this.status = status;
  }
}

function validateProductImageInput({ dataAreaId, itemNumber }) {
  const normalizedDataAreaId = String(dataAreaId || '').trim();
  const normalizedItemNumber = String(itemNumber || '').trim();

  if (!DATA_AREA_ID_PATTERN.test(normalizedDataAreaId) || !ITEM_NUMBER_PATTERN.test(normalizedItemNumber)) {
    return null;
  }

  return { dataAreaId: normalizedDataAreaId, itemNumber: normalizedItemNumber };
}

function buildCacheKey({ dataAreaId, itemNumber }) {
  return `${dataAreaId.length}:${dataAreaId}|${itemNumber.length}:${itemNumber}`;
}

function decodeImageContent(contentBase64) {
  const encoded = String(contentBase64 || '');
  const maxBase64Length = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;

  if (!encoded || encoded.length > maxBase64Length || !BASE64_PATTERN.test(encoded)) {
    throw new ProductImageServiceError('D365 leverde ongeldige afbeeldingsdata');
  }

  const image = Buffer.from(encoded, 'base64');
  if (!image.length || image.length > MAX_IMAGE_BYTES) {
    throw new ProductImageServiceError('D365 leverde een te grote afbeelding');
  }

  return image;
}

function normalizeContentType(contentType) {
  return String(contentType || '').trim().toLowerCase();
}

function resolveTrustedServiceUrl(trustedOriginValue, baseUrlValue, serviceUrlValue) {
  const rawServiceUrl = String(serviceUrlValue || '').trim();
  if (!rawServiceUrl) {
    throw new ProductImageServiceError('D365 productafbeeldingservice is niet geconfigureerd');
  }

  let trustedOrigin;
  let baseUrl;
  let serviceUrl;
  try {
    trustedOrigin = new URL(String(trustedOriginValue || '').trim());
    baseUrl = new URL(String(baseUrlValue || '').trim());
    serviceUrl = new URL(rawServiceUrl, baseUrl);
  } catch {
    throw new ProductImageServiceError('D365 productafbeeldingservice is niet geconfigureerd');
  }

  if (
    trustedOrigin.protocol !== 'https:'
    || trustedOrigin.username
    || trustedOrigin.password
    || baseUrl.protocol !== 'https:'
    || baseUrl.username
    || baseUrl.password
    || serviceUrl.protocol !== 'https:'
    || serviceUrl.username
    || serviceUrl.password
    || baseUrl.origin !== trustedOrigin.origin
    || serviceUrl.origin !== trustedOrigin.origin
  ) {
    throw new ProductImageServiceError('D365 productafbeeldingservice heeft geen vertrouwde origin');
  }

  return serviceUrl.toString();
}

function createProductImageService({
  settings = settingsService,
  getAccessTokenFn = getAccessToken,
  fetchFn = global.fetch,
  now = Date.now,
  trustedOrigin = process.env.D365_PRODUCT_IMAGE_TRUSTED_ORIGIN,
} = {}) {
  const cache = new Map();

  function readCache(cacheKey) {
    const cached = cache.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt <= now()) {
      cache.delete(cacheKey);
      return null;
    }
    return {
      contentType: cached.contentType,
      content: Buffer.from(cached.content),
    };
  }

  function writeCache(cacheKey, image) {
    if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(cacheKey)) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(cacheKey, {
      contentType: image.contentType,
      content: Buffer.from(image.content),
      expiresAt: now() + CACHE_TTL_MS,
    });
  }

  async function getRequestConfig() {
    const [baseUrl, url, timeoutValue] = await Promise.all([
      settings.getAsync('D365_ODATA_BASE_URL'),
      settings.getAsync('D365_PRODUCT_IMAGE_SERVICE_URL'),
      settings.getAsync('D365_PRODUCT_IMAGE_TIMEOUT_MS', '10000'),
    ]);
    const timeoutMs = Number.parseInt(timeoutValue, 10);

    return {
      serviceUrl: resolveTrustedServiceUrl(trustedOrigin, baseUrl, url),
      timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10000,
    };
  }

  async function fetchFromD365(input) {
    const { serviceUrl, timeoutMs } = await getRequestConfig();
    const accessToken = await getAccessTokenFn();
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(serviceUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ProductImageServiceError('D365 productafbeeldingservice gaf een fout terug');
      }

      const payload = await response.json();
      if (!payload || typeof payload !== 'object' || typeof payload.found !== 'boolean') {
        throw new ProductImageServiceError('D365 productafbeeldingservice gaf een ongeldige respons terug');
      }
      return payload;
    } catch (error) {
      if (error instanceof ProductImageServiceError) throw error;
      throw new ProductImageServiceError(
        error?.name === 'AbortError'
          ? 'D365 productafbeeldingservice reageerde niet op tijd'
          : 'D365 productafbeeldingservice is niet bereikbaar'
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  async function getProductImage(input) {
    const validInput = validateProductImageInput(input);
    if (!validInput) {
      throw new ProductImageServiceError('Ongeldige productafbeeldingparameters', 400);
    }

    const cacheKey = buildCacheKey(validInput);
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const payload = await fetchFromD365(validInput);
    if (!payload.found) return null;

    const contentType = normalizeContentType(payload.contentType);
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new ProductImageServiceError('D365 leverde een niet-toegestaan afbeeldingstype');
    }

    const image = {
      contentType,
      content: decodeImageContent(payload.contentBase64),
    };
    writeCache(cacheKey, image);
    return image;
  }

  return {
    getProductImage,
    clearCache: () => cache.clear(),
    cacheSize: () => cache.size,
  };
}

module.exports = {
  ALLOWED_CONTENT_TYPES,
  CACHE_TTL_MS,
  MAX_IMAGE_BYTES,
  ProductImageServiceError,
  buildCacheKey,
  createProductImageService,
  decodeImageContent,
  resolveTrustedServiceUrl,
  validateProductImageInput,
};
