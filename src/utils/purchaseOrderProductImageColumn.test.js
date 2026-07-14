import { describe, expect, it } from 'vitest';
import {
  PRODUCT_IMAGE_COLUMN_KEY,
  createProductImageColumn,
  isProductImageColumn,
  mergeProductImageColumnWidths,
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

  it('applies a default width when none is configured', () => {
    expect(mergeProductImageColumnWidths({ orderNumber: 120 })[PRODUCT_IMAGE_COLUMN_KEY]).toBe(52);
  });
});
