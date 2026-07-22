// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));

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
});
