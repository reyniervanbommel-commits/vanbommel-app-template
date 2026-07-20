'use strict';

const d365ODataService = require('./D365ODataService');

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const RELEASED_PRODUCT_IMAGE_ENTITY_PATH = '/data/ReleasedProductDocumentAttachments';
const PRODUCT_DOCUMENT_ATTACHMENT_ENTITY_PATH = '/data/ProductDocumentAttachments';
/** @deprecated Use RELEASED_PRODUCT_IMAGE_ENTITY_PATH — kept for tests/backwards references. */
const PRODUCT_IMAGE_ENTITY_PATH = RELEASED_PRODUCT_IMAGE_ENTITY_PATH;
const RELEASED_PRODUCT_IMAGE_SELECT_FIELDS = [
  'dataAreaId',
  'ItemNumber',
  'Attachment',
  'FileType',
  'IsProductImage',
  'IsDefaultProductImage',
  'AttachedDateTime',
];
const PRODUCT_DOCUMENT_ATTACHMENT_SELECT_FIELDS = [
  'ProductNumber',
  'DocumentAttachmentTypeCode',
  'DocumentAttachmentTypeLegalEntityId',
  'Attachment',
  'FileType',
  'IsProductImage',
  'IsDefaultProductImage',
  'AttachedDateTime',
];
/** @deprecated Use RELEASED_PRODUCT_IMAGE_SELECT_FIELDS */
const PRODUCT_IMAGE_SELECT_FIELDS = RELEASED_PRODUCT_IMAGE_SELECT_FIELDS;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const DATA_AREA_ID_PATTERN = /^[A-Za-z0-9]{2,10}$/;
const ITEM_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,59}$/;

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

function isValidBase64(encoded) {
  if (!encoded || encoded.length % 4 !== 0) return false;
  const paddingLength = encoded.endsWith('==') ? 2 : (encoded.endsWith('=') ? 1 : 0);
  const contentLength = encoded.length - paddingLength;
  for (let index = 0; index < contentLength; index += 1) {
    const code = encoded.charCodeAt(index);
    const isAlphaNumeric = (
      (code >= 48 && code <= 57)
      || (code >= 65 && code <= 90)
      || (code >= 97 && code <= 122)
    );
    if (!isAlphaNumeric && code !== 43 && code !== 47) return false;
  }
  return true;
}

function decodeImageContent(contentBase64) {
  const encoded = String(contentBase64 || '');
  const maxBase64Length = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;

  if (encoded.length > maxBase64Length || !isValidBase64(encoded)) {
    throw new ProductImageServiceError('D365 returned invalid image data');
  }

  const image = Buffer.from(encoded, 'base64');
  if (!image.length || image.length > MAX_IMAGE_BYTES) {
    throw new ProductImageServiceError('D365 returned an image that is too large');
  }

  return image;
}

function normalizeContentType(contentType) {
  return String(contentType || '').trim().toLowerCase();
}

function contentTypeFromFileType(fileType) {
  const normalized = normalizeContentType(fileType).replace(/^\./, '');
  const types = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    'image/jpeg': 'image/jpeg',
    png: 'image/png',
    'image/png': 'image/png',
    webp: 'image/webp',
    'image/webp': 'image/webp',
  };
  return types[normalized] || null;
}

function isTrue(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return value === true || value === 1 || normalized === 'true' || normalized === 'yes' || normalized === '1';
}

function hasAttachment(record) {
  return typeof record?.Attachment === 'string' && record.Attachment.length > 0;
}

function sortByAttachedDateDesc(records) {
  return [...records].sort((left, right) => (
    Date.parse(right.AttachedDateTime || 0) - Date.parse(left.AttachedDateTime || 0)
  ));
}

function isProductImageDocumentType(record) {
  return String(record?.DocumentAttachmentTypeCode || '').trim().toLowerCase() === 'productimage';
}

function selectDefaultProductImage(records) {
  return sortByAttachedDateDesc(Array.isArray(records) ? records : [])
    .filter((record) => isTrue(record?.IsProductImage) && isTrue(record?.IsDefaultProductImage) && hasAttachment(record))[0] || null;
}

function selectProductImageRecord(records) {
  const list = Array.isArray(records) ? records : [];
  const defaultImage = selectDefaultProductImage(list);
  if (defaultImage) return defaultImage;

  const productImageDocuments = sortByAttachedDateDesc(
    list.filter((record) => isProductImageDocumentType(record) && hasAttachment(record)),
  );
  if (productImageDocuments.length) return productImageDocuments[0];

  const flaggedProductImages = sortByAttachedDateDesc(
    list.filter((record) => isTrue(record?.IsProductImage) && hasAttachment(record)),
  );
  if (flaggedProductImages.length) return flaggedProductImages[0];

  return sortByAttachedDateDesc(
    list.filter((record) => hasAttachment(record) && contentTypeFromFileType(record?.FileType)),
  )[0] || null;
}

function hasMatchingMagicBytes(contentType, content) {
  if (contentType === 'image/jpeg') {
    return content.length >= 3
      && content[0] === 0xff
      && content[1] === 0xd8
      && content[2] === 0xff;
  }
  if (contentType === 'image/png') {
    return content.length >= 8
      && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (contentType === 'image/webp') {
    return content.length >= 12
      && content.subarray(0, 4).toString('ascii') === 'RIFF'
      && content.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

function escapeODataLiteral(value) {
  return String(value || '').replace(/'/g, "''");
}

function createProductImageService({
  fetchEntityRecordsFn = d365ODataService.fetchEntityRecords,
  now = Date.now,
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

  async function fetchRecords(config) {
    return fetchEntityRecordsFn({
      top: 100,
      skip: 0,
      fetchAll: true,
      maxItems: 100,
      ...config,
    });
  }

  async function fetchFromD365(input) {
    const sources = [
      {
        sourceEntity: PRODUCT_DOCUMENT_ATTACHMENT_ENTITY_PATH,
        applyCompanyFilter: false,
        extraFilter: [
          `ProductNumber eq '${escapeODataLiteral(input.itemNumber)}'`,
          `DocumentAttachmentTypeLegalEntityId eq '${escapeODataLiteral(input.dataAreaId)}'`,
        ].join(' and '),
        selectFields: PRODUCT_DOCUMENT_ATTACHMENT_SELECT_FIELDS,
      },
      {
        sourceEntity: RELEASED_PRODUCT_IMAGE_ENTITY_PATH,
        extraFilter: [
          `dataAreaId eq '${escapeODataLiteral(input.dataAreaId)}'`,
          `ItemNumber eq '${escapeODataLiteral(input.itemNumber)}'`,
        ].join(' and '),
        selectFields: RELEASED_PRODUCT_IMAGE_SELECT_FIELDS,
      },
    ];

    let lastError = null;
    for (const source of sources) {
      try {
        const result = await fetchRecords(source);
        const record = selectProductImageRecord(result?.items);
        if (record) return record;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof ProductImageServiceError) throw lastError;
    if (lastError) {
      throw new ProductImageServiceError('D365 product image entities are unavailable');
    }
    return null;
  }

  async function getProductImage(input) {
    const validInput = validateProductImageInput(input);
    if (!validInput) {
      throw new ProductImageServiceError('Invalid product image parameters', 400);
    }

    const cacheKey = buildCacheKey(validInput);
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const record = await fetchFromD365(validInput);
    if (!record) return null;

    const contentType = contentTypeFromFileType(record.FileType);
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new ProductImageServiceError('D365 returned a disallowed image type');
    }

    const content = decodeImageContent(record.Attachment);
    if (!hasMatchingMagicBytes(contentType, content)) {
      throw new ProductImageServiceError('D365 image content does not match the file type');
    }

    const image = {
      contentType,
      content,
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
  PRODUCT_DOCUMENT_ATTACHMENT_ENTITY_PATH,
  PRODUCT_DOCUMENT_ATTACHMENT_SELECT_FIELDS,
  PRODUCT_IMAGE_ENTITY_PATH,
  PRODUCT_IMAGE_SELECT_FIELDS,
  RELEASED_PRODUCT_IMAGE_ENTITY_PATH,
  RELEASED_PRODUCT_IMAGE_SELECT_FIELDS,
  ProductImageServiceError,
  buildCacheKey,
  contentTypeFromFileType,
  createProductImageService,
  decodeImageContent,
  hasMatchingMagicBytes,
  selectDefaultProductImage,
  selectProductImageRecord,
  validateProductImageInput,
};
