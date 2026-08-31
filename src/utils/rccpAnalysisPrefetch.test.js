import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const WINDOW = { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8 };

vi.mock('./api', () => ({ apiRequest: vi.fn() }));

describe('rccpAnalysisPrefetch', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts a fetch and caches the promise for the same vendor+window', async () => {
    const { apiRequest } = await import('./api');
    apiRequest.mockResolvedValue({ kpis: {} });
    const { prefetchRccpAnalysis, getCachedRccpAnalysis } = await import('./rccpAnalysisPrefetch');

    const promise = prefetchRccpAnalysis(WINDOW, 'V000583');
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(getCachedRccpAnalysis(WINDOW, 'V000583')).toBe(promise);

    // Re-prefetching the same vendor+window must NOT fire a second request (dedupe).
    prefetchRccpAnalysis(WINDOW, 'V000583');
    expect(apiRequest).toHaveBeenCalledTimes(1);

    await promise;
  });

  it('keeps requested and confirmed prefetch caches separate', async () => {
    const { apiRequest } = await import('./api');
    apiRequest.mockResolvedValue({ kpis: {} });
    const { prefetchRccpAnalysis } = await import('./rccpAnalysisPrefetch');

    prefetchRccpAnalysis(WINDOW, 'V000583', 'requested');
    prefetchRccpAnalysis(WINDOW, 'V000583', 'confirmed');
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest.mock.calls[0][0]).toContain('planningDateMode=requested');
    expect(apiRequest.mock.calls[1][0]).toContain('planningDateMode=confirmed');
  });

  it('returns null and does not fetch when no vendor is given', async () => {
    const { apiRequest } = await import('./api');
    const { prefetchRccpAnalysis, getCachedRccpAnalysis } = await import('./rccpAnalysisPrefetch');

    expect(prefetchRccpAnalysis(WINDOW, '')).toBeNull();
    expect(getCachedRccpAnalysis(WINDOW, '')).toBeNull();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('drops a failed prefetch from the cache so a retry can happen', async () => {
    const { apiRequest } = await import('./api');
    apiRequest.mockRejectedValueOnce(new Error('network down'));
    const { prefetchRccpAnalysis, getCachedRccpAnalysis } = await import('./rccpAnalysisPrefetch');

    const promise = prefetchRccpAnalysis(WINDOW, 'V000696');
    await expect(promise).rejects.toThrow('network down');
    // Give the internal .catch() cleanup a tick to run.
    await Promise.resolve();

    expect(getCachedRccpAnalysis(WINDOW, 'V000696')).toBeNull();
  });
});
