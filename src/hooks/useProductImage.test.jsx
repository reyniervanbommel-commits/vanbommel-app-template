// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductImage } from './useProductImage';

function imageResponse({ status = 200, retryAfter = null } = {}) {
  const isEmpty = status === 204;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (key) => (key.toLowerCase() === 'retry-after' ? retryAfter : null) },
    blob: async () => (isEmpty ? new Blob([], { type: '' }) : new Blob(['x'], { type: 'image/png' })),
  };
}

let objectUrlCounter = 0;

describe('useProductImage', () => {
  beforeEach(() => {
    objectUrlCounter = 0;
    URL.createObjectURL = vi.fn(() => `blob:mock-${++objectUrlCounter}`);
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads an image and exposes an object URL', async () => {
    global.fetch = vi.fn(async () => imageResponse({ status: 200 }));
    const url = '/api/media/product-image?dataAreaId=NL01&itemNumber=A-load';

    const { result } = renderHook(() => useProductImage(url));

    await waitFor(() => expect(result.current.status).toBe('loaded'));
    expect(result.current.src).toMatch(/^blob:mock-/);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent requests for the same URL', async () => {
    global.fetch = vi.fn(async () => imageResponse({ status: 200 }));
    const url = '/api/media/product-image?dataAreaId=NL01&itemNumber=A-dedup';

    const first = renderHook(() => useProductImage(url));
    const second = renderHook(() => useProductImage(url));

    await waitFor(() => expect(first.result.current.status).toBe('loaded'));
    await waitFor(() => expect(second.result.current.status).toBe('loaded'));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(first.result.current.src).toBe(second.result.current.src);
  });

  it('reports an error for an empty (204) response without retrying', async () => {
    global.fetch = vi.fn(async () => imageResponse({ status: 204 }));
    const url = '/api/media/product-image?dataAreaId=NL01&itemNumber=A-empty';

    const { result } = renderHook(() => useProductImage(url));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.src).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries after a 429 and then succeeds', async () => {
    let calls = 0;
    global.fetch = vi.fn(async () => {
      calls += 1;
      return calls === 1 ? imageResponse({ status: 429 }) : imageResponse({ status: 200 });
    });
    const url = '/api/media/product-image?dataAreaId=NL01&itemNumber=A-429';

    const { result } = renderHook(() => useProductImage(url));

    await waitFor(() => expect(result.current.status).toBe('loaded'), { timeout: 3000 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
