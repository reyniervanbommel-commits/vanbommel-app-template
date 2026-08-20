// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../utils/rccpAnalysisPrefetch', () => ({
  getCachedRccpAnalysis: vi.fn(() => null),
  clearRccpAnalysisPrefetchCache: vi.fn(),
}));

describe('useRccpPage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not show a loading spinner when no vendor is selected (enabled=false)', async () => {
    const { apiRequest } = await import('../utils/api');
    apiRequest.mockResolvedValue({ settings: {} }); // board-settings call from useRccpWindow
    const { useRccpPage } = await import('./useRccpPage');

    const { result } = renderHook(() => useRccpPage({ vendorAccount: '', enabled: false }));

    // Direct na mount al geen spinner en geen analyse — geen "kies-nog-niets"-vendor-fetch.
    expect(result.current.loading).toBe(false);
    expect(result.current.analysis).toBeNull();

    // Ruime timeout: de eerste test in dit bestand betaalt de eenmalige cold-start compile van
    // de volledige module-graaf (incl. Fluent UI); op een zwaarbelaste/parallelle testrun kan
    // dat (zeer) lang duren — dit is machine-belasting, geen logica-probleem (zie losse run).
    await waitFor(() => expect(result.current.windowLoaded).toBe(true), { timeout: 100000 });
    expect(result.current.loading).toBe(false);
    expect(result.current.analysis).toBeNull();
    // Alleen de board-settings call voor het weekvenster, geen /rccp/analysis call.
    expect(apiRequest).not.toHaveBeenCalledWith(expect.stringContaining('/rccp/analysis'));
  }, 120000);

  it('fetches the analysis once a vendor is selected (enabled=true)', async () => {
    const { apiRequest } = await import('../utils/api');
    apiRequest.mockResolvedValue({ kpis: {}, measureRows: [], periods: [], cells: [] });
    const { useRccpPage } = await import('./useRccpPage');

    const { result } = renderHook(() => useRccpPage({ vendorAccount: 'V000583', enabled: true }));

    await waitFor(() => expect(result.current.analysis).not.toBeNull(), { timeout: 15000 });
    expect(result.current.loading).toBe(false);
    expect(result.current.analysis).toEqual({ kpis: {}, measureRows: [], periods: [], cells: [] });
    expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('vendorAccount=V000583'));
  }, 20000);

  it('bypasses the prefetch cache on reload so chart settings can refresh', async () => {
    const { apiRequest } = await import('../utils/api');
    const { getCachedRccpAnalysis, clearRccpAnalysisPrefetchCache } = await import('../utils/rccpAnalysisPrefetch');
    const stale = {
      kpis: {},
      periods: [],
      cells: [],
      measureRows: [{ measureKey: 'quantity', chartType: 'line', showInChart: true }],
    };
    const fresh = {
      kpis: {},
      periods: [],
      cells: [],
      measureRows: [{ measureKey: 'quantity', chartType: 'bar', showInChart: true }],
    };
    getCachedRccpAnalysis.mockReturnValue(Promise.resolve(stale));
    apiRequest.mockImplementation((url) => {
      if (String(url).includes('/rccp/analysis')) return Promise.resolve(fresh);
      return Promise.resolve({ settings: {} });
    });
    const { useRccpPage } = await import('./useRccpPage');

    const { result } = renderHook(() => useRccpPage({ vendorAccount: 'V000583', enabled: true }));
    await waitFor(() => expect(result.current.analysis).toEqual(stale), { timeout: 15000 });

    await act(async () => {
      await result.current.reload();
    });

    expect(clearRccpAnalysisPrefetchCache).toHaveBeenCalled();
    await waitFor(() => expect(result.current.analysis).toEqual(fresh));
  }, 20000);

  it('applies a saved chart type immediately without waiting for refetch', async () => {
    const { apiRequest } = await import('../utils/api');
    apiRequest.mockResolvedValue({
      kpis: {},
      periods: [],
      cells: [],
      config: {},
      measureRows: [{ measureKey: 'quantity', label: 'Quantity', chartType: 'line', color: '#D13438', showInChart: true }],
    });
    const { useRccpPage } = await import('./useRccpPage');
    const { publishRccpSettingsSaved } = await import('./rccpSettingsSync');

    const { result } = renderHook(() => useRccpPage({ vendorAccount: 'V000583', enabled: true }));
    await waitFor(() => expect(result.current.measureRows[0]?.chartType).toBe('line'), { timeout: 15000 });

    apiRequest.mockImplementation(() => new Promise(() => {}));
    act(() => {
      publishRccpSettingsSaved({
        quantityMeasures: [
          { columnKey: 'quantity', label: 'Quantity', chartType: 'bar', color: '#0078D4', showInChart: true },
        ],
      });
    });

    expect(result.current.measureRows[0].chartType).toBe('bar');
    expect(result.current.loading).toBe(false);
  }, 20000);
});
