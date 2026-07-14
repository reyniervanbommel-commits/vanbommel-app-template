import { MAX_COLUMN_WIDTH, normalizeColumnOrder } from './boardColumnSettings';

export const PRODUCT_IMAGE_COLUMN_KEY = '__productImage';
export const DEFAULT_PRODUCT_IMAGE_COLUMN_WIDTH = 52;
export const PRODUCT_IMAGE_MIN_COLUMN_WIDTH = 32;
export const PRODUCT_IMAGE_THUMBNAIL_SIZE = 28;
export const PRODUCT_IMAGE_HOVER_SCALE = 5;
export const PRODUCT_IMAGE_HOVER_MAX_SIZE = DEFAULT_PRODUCT_IMAGE_COLUMN_WIDTH * PRODUCT_IMAGE_HOVER_SCALE;

export function getProductImageCellStyle(baseStyle) {
  return {
    ...(baseStyle || {}),
    padding: 0,
    height: '1px',
    verticalAlign: 'middle',
    overflow: 'hidden',
  };
}

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

export function extendDefaultColumnKeys(keys) {
  const base = Array.isArray(keys) ? keys.filter(Boolean) : [];
  if (base.includes(PRODUCT_IMAGE_COLUMN_KEY)) return base;
  return [PRODUCT_IMAGE_COLUMN_KEY, ...base];
}

export function clampProductImageColumnWidth(width) {
  const parsed = Number(width);
  if (!Number.isFinite(parsed)) return DEFAULT_PRODUCT_IMAGE_COLUMN_WIDTH;
  return Math.min(MAX_COLUMN_WIDTH, Math.max(PRODUCT_IMAGE_MIN_COLUMN_WIDTH, Math.round(parsed)));
}

export function resolveProductImageColumnWidth(widths = {}) {
  return clampProductImageColumnWidth(widths?.[PRODUCT_IMAGE_COLUMN_KEY]);
}

export function mergeProductImageColumnWidths(widths = {}) {
  return {
    ...widths,
    [PRODUCT_IMAGE_COLUMN_KEY]: resolveProductImageColumnWidth(widths),
  };
}

export function withProductImageColumn(columns, level = 'header') {
  const list = Array.isArray(columns) ? columns : [];
  if (list.some(isProductImageColumn)) return list;
  return [createProductImageColumn(level), ...list];
}

export function orderColumnsWithProductImage(dataColumns, columnOrderKeys, level = 'header') {
  const dataList = Array.isArray(dataColumns) ? dataColumns : [];
  const dataByKey = new Map(dataList.map((column) => [column.key, column]));
  const defaultKeys = extendDefaultColumnKeys(dataList.map((column) => column.key));
  const order = normalizeColumnOrder(columnOrderKeys, defaultKeys);
  return order
    .filter((key) => key === PRODUCT_IMAGE_COLUMN_KEY || dataByKey.has(key))
    .map((key) => (key === PRODUCT_IMAGE_COLUMN_KEY
      ? createProductImageColumn(level)
      : dataByKey.get(key)));
}

export function applyProductImageColumnWidth(columnKey, width, widths = {}) {
  if (columnKey !== PRODUCT_IMAGE_COLUMN_KEY) return widths;
  return {
    ...widths,
    [PRODUCT_IMAGE_COLUMN_KEY]: clampProductImageColumnWidth(width),
  };
}
