import { describe, expect, it } from 'vitest';
import { isProductAttributeColumn } from './productAttributeColumn';

describe('isProductAttributeColumn', () => {
  it('herkent kind product-attribute', () => {
    expect(isProductAttributeColumn({ options: { kind: 'product-attribute' } })).toBe(true);
    expect(isProductAttributeColumn({ options: { kind: 'lookup' } })).toBe(false);
    expect(isProductAttributeColumn(null)).toBe(false);
  });
});
