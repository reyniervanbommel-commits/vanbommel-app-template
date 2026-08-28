import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearBiCache,
  loadBiCharts,
  loadBiMeta,
  setBiMeta,
} from './biBoardCache';

describe('loadBiMeta / loadBiCharts', () => {
  beforeEach(() => {
    clearBiCache();
  });

  it('returns cached meta without calling the fetcher', async () => {
    const cached = { columns: [{ key: 'status' }], measureColumns: [] };
    setBiMeta('purchase-orders', cached);
    const fetcher = vi.fn();

    await expect(loadBiMeta('purchase-orders', fetcher)).resolves.toEqual(cached);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('shares one in-flight meta request between prefetch and the BI page', async () => {
    let resolveFetch;
    const fetcher = vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));

    const first = loadBiMeta('purchase-orders', fetcher);
    const second = loadBiMeta('purchase-orders', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveFetch({ columns: [{ key: 'qty' }], measureColumns: [] });
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual(b);
    expect(a.columns).toEqual([{ key: 'qty' }]);
  });

  it('shares one in-flight charts request', async () => {
    let resolveFetch;
    const fetcher = vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));

    const first = loadBiCharts(fetcher);
    const second = loadBiCharts(fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveFetch({ charts: [{ id: 1 }] });
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual([{ id: 1 }]);
    expect(b).toEqual([{ id: 1 }]);
  });
});
