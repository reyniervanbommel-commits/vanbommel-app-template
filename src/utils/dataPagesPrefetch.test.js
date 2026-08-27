import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./poBoardKpiCache', () => ({ getPoBoardKpis: vi.fn() }));
vi.mock('./rccpAnalysisPrefetch', () => ({ prefetchRccpAnalysis: vi.fn() }));
vi.mock('./biBoardPrefetch', () => ({ prefetchBiDashboard: vi.fn() }));
vi.mock('./api', () => ({ apiRequest: vi.fn() }));
vi.mock('./poVendorFilterHandoff', () => ({ readPoFilterByColumnForRccp: vi.fn() }));
vi.mock('../components/rccp/RccpPage.jsx', () => ({ default: () => null }));
vi.mock('../components/bi/BiPage.jsx', () => ({ default: () => null }));

import { getPoBoardKpis } from './poBoardKpiCache';
import { prefetchRccpAnalysis } from './rccpAnalysisPrefetch';
import { prefetchBiDashboard } from './biBoardPrefetch';
import { apiRequest } from './api';
import { readPoFilterByColumnForRccp } from './poVendorFilterHandoff';
import { kickDataPagesPrefetch, setDataPagesPrefetchParams, startDataPagesPrefetch } from './dataPagesPrefetch';

const WINDOW = { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 8 };
const NO_VENDORS = { vendors: [], vendorNames: {}, vendorColumnKey: 'vendorAccount' };

describe('startDataPagesPrefetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPoBoardKpis.mockResolvedValue({});
    prefetchRccpAnalysis.mockResolvedValue({});
    prefetchBiDashboard.mockResolvedValue(undefined);
    readPoFilterByColumnForRccp.mockReturnValue(null);
    apiRequest.mockImplementation((path) => {
      if (path === '/rccp/vendors') return Promise.resolve(NO_VENDORS);
      throw new Error(`unexpected apiRequest(${path})`);
    });
  });

  it('runs the steps in order: board-kpis, then RCCP analysis, then BI', async () => {
    const order = [];
    getPoBoardKpis.mockImplementation(async () => { order.push('kpis'); return {}; });
    prefetchRccpAnalysis.mockImplementation(() => { order.push('rccp'); return Promise.resolve({}); });
    prefetchBiDashboard.mockImplementation(async () => { order.push('bi'); });
    apiRequest.mockImplementation((path) => {
      if (path === '/rccp/vendors') return Promise.resolve({ vendors: ['V1'], vendorNames: {}, vendorColumnKey: 'vendorAccount' });
      throw new Error(`unexpected apiRequest(${path})`);
    });

    await startDataPagesPrefetch({ refreshKey: 'r1', lastVendor: 'V1', isoWindow: WINDOW });

    expect(order).toEqual(['kpis', 'rccp', 'bi']);
  });

  it('resolves the RCCP vendor from the active PO column filter, not from lastVendor, when both exist', async () => {
    readPoFilterByColumnForRccp.mockReturnValue({ vendorAccount: { operator: 'equals', value: 'V2' } });
    apiRequest.mockImplementation((path) => {
      if (path === '/rccp/vendors') return Promise.resolve({ vendors: ['V1', 'V2'], vendorNames: {}, vendorColumnKey: 'vendorAccount' });
      throw new Error(`unexpected apiRequest(${path})`);
    });

    await startDataPagesPrefetch({ refreshKey: 'r-filter', lastVendor: 'V1', isoWindow: WINDOW });

    // RccpPageContent.jsx prioritizes the PO-filter vendor over lastVendor — the prefetch must
    // warm the vendor RCCP will actually request, or the cache-hit never happens.
    expect(prefetchRccpAnalysis).toHaveBeenCalledWith(WINDOW, 'V2');
  });

  it('falls back to lastVendor for RCCP when there is no active PO column filter', async () => {
    apiRequest.mockImplementation((path) => {
      if (path === '/rccp/vendors') return Promise.resolve({ vendors: ['V1'], vendorNames: {}, vendorColumnKey: 'vendorAccount' });
      throw new Error(`unexpected apiRequest(${path})`);
    });

    await startDataPagesPrefetch({ refreshKey: 'r-fallback', lastVendor: 'V1', isoWindow: WINDOW });

    expect(prefetchRccpAnalysis).toHaveBeenCalledWith(WINDOW, 'V1');
  });

  it('skips the RCCP analysis prefetch when no vendor resolves at all', async () => {
    await startDataPagesPrefetch({ refreshKey: 'r2', lastVendor: '', isoWindow: WINDOW });

    expect(prefetchRccpAnalysis).not.toHaveBeenCalled();
    expect(prefetchBiDashboard).toHaveBeenCalledWith({ externalFilterByColumn: undefined });
  });

  it('passes the PO-filter vendor to prefetchBiDashboard as externalFilterByColumn (no lastVendor fallback for BI)', async () => {
    readPoFilterByColumnForRccp.mockReturnValue({ vendorAccount: { operator: 'equals', value: 'V2' } });
    apiRequest.mockImplementation((path) => {
      if (path === '/rccp/vendors') return Promise.resolve({ vendors: ['V1', 'V2'], vendorNames: {}, vendorColumnKey: 'vendorAccount' });
      throw new Error(`unexpected apiRequest(${path})`);
    });

    // BI never falls back to lastVendor — with no PO filter it must stay undefined even though
    // lastVendor is set (see useBiVendorFilter.js: no lastVendor fallback tier at all).
    await startDataPagesPrefetch({ refreshKey: 'r-bi-filter', lastVendor: 'V1', isoWindow: WINDOW });
    expect(prefetchBiDashboard).toHaveBeenCalledWith({
      externalFilterByColumn: { vendorAccount: { operator: 'equals', value: 'V2' } },
    });

    prefetchBiDashboard.mockClear();
    readPoFilterByColumnForRccp.mockReturnValue(null);
    await startDataPagesPrefetch({ refreshKey: 'r-bi-nofilter', lastVendor: 'V1', isoWindow: WINDOW });
    expect(prefetchBiDashboard).toHaveBeenCalledWith({ externalFilterByColumn: undefined });
  });

  it('skips vendor resolution entirely for suppliers', async () => {
    await startDataPagesPrefetch({ refreshKey: 'r-supplier', lastVendor: 'V1', isoWindow: WINDOW, isSupplier: true });

    expect(apiRequest).not.toHaveBeenCalledWith('/rccp/vendors');
    expect(prefetchRccpAnalysis).not.toHaveBeenCalled();
    expect(prefetchBiDashboard).toHaveBeenCalledWith({ externalFilterByColumn: undefined });
  });

  it('swallows a getPoBoardKpis rejection without throwing to the caller', async () => {
    getPoBoardKpis.mockRejectedValue(new Error('boom'));

    await expect(
      startDataPagesPrefetch({ refreshKey: 'r3', lastVendor: 'V1', isoWindow: WINDOW }),
    ).resolves.toBeUndefined();
    // Sequentiële keten: een vroege stap die faalt stopt de rest stil, geen losse fouten per stap.
    expect(prefetchRccpAnalysis).not.toHaveBeenCalled();
    expect(prefetchBiDashboard).not.toHaveBeenCalled();
  });

  it('dedupeert: een tweede call met dezelfde refreshKey doet geen tweede board-kpis-call', async () => {
    await startDataPagesPrefetch({ refreshKey: 'r4', lastVendor: 'V1', isoWindow: WINDOW });
    await startDataPagesPrefetch({ refreshKey: 'r4', lastVendor: 'V1', isoWindow: WINDOW });

    expect(getPoBoardKpis).toHaveBeenCalledTimes(1);
  });
});

describe('kickDataPagesPrefetch (rail-hover)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDataPagesPrefetchParams(null);
    getPoBoardKpis.mockResolvedValue({});
    prefetchRccpAnalysis.mockResolvedValue({});
    prefetchBiDashboard.mockResolvedValue(undefined);
    readPoFilterByColumnForRccp.mockReturnValue(null);
    apiRequest.mockImplementation((path) => {
      if (path === '/rccp/vendors') return Promise.resolve({ vendors: ['V9'], vendorNames: {}, vendorColumnKey: 'vendorAccount' });
      throw new Error(`unexpected apiRequest(${path})`);
    });
  });

  it('does nothing when the PO page never recorded params this session', () => {
    expect(kickDataPagesPrefetch()).toBeUndefined();
    expect(getPoBoardKpis).not.toHaveBeenCalled();
  });

  it('starts a prefetch with the last params the PO page recorded, without waiting for idle', async () => {
    setDataPagesPrefetchParams({ refreshKey: 'hover-1', lastVendor: 'V9', isoWindow: WINDOW, isSupplier: false });

    await kickDataPagesPrefetch();

    expect(getPoBoardKpis).toHaveBeenCalledWith('hover-1');
    expect(prefetchRccpAnalysis).toHaveBeenCalledWith(WINDOW, 'V9');
  });
});
