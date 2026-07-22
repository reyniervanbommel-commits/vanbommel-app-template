import { afterEach, describe, expect, it } from 'vitest';
import {
  hasFailedProductImage,
  markProductImageFailed,
  resetProductImageFailureCache,
} from './productImageFailureCache';

describe('productImageFailureCache', () => {
  afterEach(() => {
    resetProductImageFailureCache();
  });

  it('reports unknown urls as not failed', () => {
    expect(hasFailedProductImage('/api/media/product-image?itemNumber=X')).toBe(false);
  });

  it('remembers a marked url as failed', () => {
    const url = '/api/media/product-image?itemNumber=X';
    markProductImageFailed(url);
    expect(hasFailedProductImage(url)).toBe(true);
  });

  it('ignores empty urls', () => {
    expect(hasFailedProductImage('')).toBe(false);
    expect(hasFailedProductImage(undefined)).toBe(false);
    markProductImageFailed('');
    expect(hasFailedProductImage('')).toBe(false);
  });

  it('clears all failures on reset', () => {
    const url = '/api/media/product-image?itemNumber=X';
    markProductImageFailed(url);
    resetProductImageFailureCache();
    expect(hasFailedProductImage(url)).toBe(false);
  });
});
