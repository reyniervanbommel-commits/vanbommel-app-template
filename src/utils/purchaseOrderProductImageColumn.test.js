import { describe, expect, it } from 'vitest';
import {
  PRODUCT_IMAGE_COLUMN_KEY,
  PRODUCT_IMAGE_MIN_COLUMN_WIDTH,
  clampProductImageColumnWidth,
  createProductImageColumn,
  extendDefaultColumnKeys,
  getProductImageCellStyle,
  isProductImageColumn,
  mergeProductImageColumnWidths,
  orderColumnsWithProductImage,
  withProductImageColumn,
} from './purchaseOrderProductImageColumn';

describe('purchaseOrderProductImageColumn', () => {
  it('creates a fixed system column definition', () => {
    const column = createProductImageColumn('line');
    expect(column.key).toBe(PRODUCT_IMAGE_COLUMN_KEY);
    expect(column.label).toBe('Image');
    expect(column.level).toBe('line');
    expect(column.system).toBe(true);
  });

  it('prepends the product image column once', () => {
    const columns = [{ key: 'orderNumber', label: 'Order' }];
    const withImage = withProductImageColumn(columns, 'header');
    expect(withImage).toHaveLength(2);
    expect(isProductImageColumn(withImage[0])).toBe(true);
    expect(withProductImageColumn(withImage, 'header')).toBe(withImage);
  });

  it('extends default column keys with the product image key', () => {
    expect(extendDefaultColumnKeys(['orderNumber'])).toEqual([
      PRODUCT_IMAGE_COLUMN_KEY,
      'orderNumber',
    ]);
  });

  it('orders the product image column from saved column order', () => {
    const ordered = orderColumnsWithProductImage(
      [{ key: 'orderNumber', label: 'Order' }],
      ['orderNumber', PRODUCT_IMAGE_COLUMN_KEY],
      'header'
    );
    expect(ordered.map((column) => column.key)).toEqual(['orderNumber', PRODUCT_IMAGE_COLUMN_KEY]);
  });

  it('applies a default width when none is configured', () => {
    expect(mergeProductImageColumnWidths({ orderNumber: 120 })[PRODUCT_IMAGE_COLUMN_KEY]).toBe(52);
  });

  it('allows a smaller minimum width for the image column', () => {
    expect(clampProductImageColumnWidth(36)).toBe(36);
    expect(clampProductImageColumnWidth(20)).toBe(PRODUCT_IMAGE_MIN_COLUMN_WIDTH);
  });

  it('removes padding so thumbnails can fill the full cell', () => {
    expect(getProductImageCellStyle({ width: '52px' })).toMatchObject({
      width: '52px',
      padding: 0,
      height: 'calc(32px * var(--po-table-zoom, 0.85))',
      maxHeight: 'calc(32px * var(--po-table-zoom, 0.85))',
    });
  });
});
