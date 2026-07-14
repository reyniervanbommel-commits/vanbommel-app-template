export const PRODUCT_IMAGE_COLUMN_KEY = '__productImage';
export const DEFAULT_PRODUCT_IMAGE_COLUMN_WIDTH = 52;

export function createProductImageColumn(level = 'header') {
  return {
    id: null,
    key: PRODUCT_IMAGE_COLUMN_KEY,
    label: 'Image',
    level: level === 'line' ? 'line' : 'header',
    source: 'system',
    dataType: 'productImage',
    writableToD365: false,
    writeBackAllowed: false,
    system: true,
  };
}

export function isProductImageColumn(column) {
  if (!column || typeof column !== 'object') return false;
  return column.key === PRODUCT_IMAGE_COLUMN_KEY || column.dataType === 'productImage';
}

export function withProductImageColumn(columns, level = 'header') {
  const list = Array.isArray(columns) ? columns : [];
  if (list.some(isProductImageColumn)) return list;
  return [createProductImageColumn(level), ...list];
}

export function resolveProductImageColumnWidth(widths = {}) {
  const configured = widths?.[PRODUCT_IMAGE_COLUMN_KEY];
  if (Number.isFinite(configured) && configured > 0) return configured;
  return DEFAULT_PRODUCT_IMAGE_COLUMN_WIDTH;
}

export function mergeProductImageColumnWidths(widths = {}) {
  return {
    ...widths,
    [PRODUCT_IMAGE_COLUMN_KEY]: resolveProductImageColumnWidth(widths),
  };
}
