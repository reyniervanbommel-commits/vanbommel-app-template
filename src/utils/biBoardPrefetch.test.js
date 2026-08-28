import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ apiRequest: vi.fn() }));

import { apiRequest } from './api';
import { prefetchBiDashboard } from './biBoardPrefetch';
import { clearBiCache, getBiCharts, getBiMeta, getBiSeries } from './biBoardCache';
import { chartFetchKey } from './biChartFetchKey';

describe('prefetchBiDashboard', () => {
  beforeEach(() => {
    clearBiCache();
    vi.clearAllMocks();
  });

  it('seeds biBoardCache under the exact key useChartData builds when a vendor filter is given', async () => {
    apiRequest.mockImplementation((path) => {
      if (path === '/bi/date-filter') return Promise.resolve({ dateFilter: null });
      if (path === '/bi/meta/purchase-orders') return Promise.resolve({ columns: [] });
      if (path === '/bi/charts') {
        return Promise.resolve({
          charts: [{ id: 1, config: { type: 'bar', dimension: 'status', measure: 'quantity', filters: [] } }],
        });
      }
      if (path === '/bi/aggregate') {
        return Promise.resolve({ revision: 7, results: [{ series: [{ x: 'Open', y: 3 }] }] });
      }
      throw new Error(`unexpected apiRequest(${path})`);
    });

    await prefetchBiDashboard({
      externalFilterByColumn: { vendorAccount: { operator: 'equals', value: 'V000583' } },
    });

    const inheritedFilters = [
      { columnKey: 'vendorAccount', operator: 'equals', value: 'V000583', secondaryValue: '' },
    ];
    const chart = { id: 1, config: { type: 'bar', dimension: 'status', measure: 'quantity', filters: [] } };
    const key = chartFetchKey(chart, inheritedFilters, null, null);

    expect(getBiSeries(key)).toEqual([{ x: 'Open', y: 3 }]);
    expect(apiRequest).not.toHaveBeenCalledWith('/rccp/vendors');
    expect(apiRequest).toHaveBeenCalledWith('/bi/aggregate', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({
        boardKey: 'purchase-orders',
        charts: [expect.objectContaining({ filters: inheritedFilters })],
      }),
    }));
  });

  it('fetches without any vendor filter when externalFilterByColumn is omitted (suppliers / all-vendors)', async () => {
    apiRequest.mockImplementation((path) => {
      if (path === '/bi/date-filter') return Promise.resolve({ dateFilter: null });
      if (path === '/bi/meta/purchase-orders') return Promise.resolve({ columns: [] });
      if (path === '/bi/charts') return Promise.resolve({ charts: [{ id: 1, config: { type: 'bar', filters: [] } }] });
      if (path === '/bi/aggregate') return Promise.resolve({ revision: 1, results: [{ series: [] }] });
      throw new Error(`unexpected apiRequest(${path})`);
    });

    await prefetchBiDashboard();

    expect(apiRequest).toHaveBeenCalledWith('/bi/aggregate', expect.objectContaining({
      body: expect.objectContaining({ charts: [expect.objectContaining({ filters: [] })] }),
    }));
  });

  it('includes the date filter only when the shared BI date-filter setting is enabled', async () => {
    apiRequest.mockImplementation((path) => {
      if (path === '/bi/date-filter') {
        return Promise.resolve({
          dateFilter: { enabled: true, isoWindow: { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 2 } },
        });
      }
      if (path === '/bi/meta/purchase-orders') {
        return Promise.resolve({ columns: [{ key: 'plannedDate', dataType: 'date' }] });
      }
      if (path === '/bi/charts') {
        return Promise.resolve({ charts: [{ id: 1, config: { type: 'bar', dimension: 'plannedDate', filters: [] } }] });
      }
      if (path === '/bi/aggregate') return Promise.resolve({ revision: 1, results: [{ series: [] }] });
      throw new Error(`unexpected apiRequest(${path})`);
    });

    await prefetchBiDashboard();

    expect(apiRequest).toHaveBeenCalledWith('/bi/aggregate', expect.objectContaining({
      body: expect.objectContaining({
        charts: [expect.objectContaining({
          filters: [expect.objectContaining({ columnKey: 'plannedDate', operator: 'between' })],
        })],
      }),
    }));
  });

  it('skips the date filter when the shared BI date-filter setting is disabled', async () => {
    apiRequest.mockImplementation((path) => {
      if (path === '/bi/date-filter') {
        return Promise.resolve({
          dateFilter: { enabled: false, isoWindow: { fromYear: 2026, fromWeek: 1, toYear: 2026, toWeek: 2 } },
        });
      }
      if (path === '/bi/meta/purchase-orders') {
        return Promise.resolve({ columns: [{ key: 'plannedDate', dataType: 'date' }] });
      }
      if (path === '/bi/charts') {
        return Promise.resolve({ charts: [{ id: 1, config: { type: 'bar', dimension: 'plannedDate', filters: [] } }] });
      }
      if (path === '/bi/aggregate') return Promise.resolve({ revision: 1, results: [{ series: [] }] });
      throw new Error(`unexpected apiRequest(${path})`);
    });

    await prefetchBiDashboard();

    expect(apiRequest).toHaveBeenCalledWith('/bi/aggregate', expect.objectContaining({
      body: expect.objectContaining({ charts: [expect.objectContaining({ filters: [] })] }),
    }));
  });

  it('seeds charts and meta so BiPage can skip the loading spinner', async () => {
    const charts = [{ id: 1, config: { type: 'bar', filters: [] } }];
    const columns = [{ key: 'status', dataType: 'string' }];
    apiRequest.mockImplementation((path) => {
      if (path === '/bi/date-filter') return Promise.resolve({ dateFilter: null });
      if (path === '/bi/meta/purchase-orders') {
        return Promise.resolve({ columns, measureColumns: [] });
      }
      if (path === '/bi/charts') return Promise.resolve({ charts });
      if (path === '/bi/aggregate') return Promise.resolve({ revision: 1, results: [{ series: [] }] });
      throw new Error(`unexpected apiRequest(${path})`);
    });

    await prefetchBiDashboard();

    expect(getBiCharts()).toEqual(charts);
    expect(getBiMeta('purchase-orders')).toEqual({ columns, measureColumns: [] });
  });

  it('does nothing when there are no charts to prefetch', async () => {
    apiRequest.mockImplementation((path) => {
      if (path === '/bi/date-filter') return Promise.resolve({ dateFilter: null });
      if (path === '/bi/meta/purchase-orders') return Promise.resolve({ columns: [] });
      if (path === '/bi/charts') return Promise.resolve({ charts: [] });
      throw new Error(`unexpected apiRequest(${path})`);
    });

    await prefetchBiDashboard();

    expect(apiRequest).not.toHaveBeenCalledWith('/bi/aggregate', expect.anything());
  });
});
