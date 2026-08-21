// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));
vi.mock('./usePageActive', () => ({ usePageActive: () => true }));
vi.mock('./useBoardRevisionGate', () => ({ useBoardRevisionGate: () => {} }));

const window = { fromYear: 2026, fromWeek: 10, toYear: 2026, toWeek: 12 };

describe('useRccpDeliveryPlan', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not fetch when the tab is inactive', async () => {
    const { apiRequest } = await import('../utils/api');
    const { useRccpDeliveryPlan } = await import('./useRccpDeliveryPlan');
    renderHook(() => useRccpDeliveryPlan({
      vendorAccount: 'V1',
      window,
      windowLoaded: true,
      enabled: false,
    }));
    await waitFor(() => expect(apiRequest).not.toHaveBeenCalled());
  });

  it('fetches delivery-plan data when enabled with a vendor', async () => {
    const { apiRequest } = await import('../utils/api');
    apiRequest.mockResolvedValue({ orders: [], weeks: [], weeklyCapacity: {}, config: {} });
    const { useRccpDeliveryPlan } = await import('./useRccpDeliveryPlan');
    const { result } = renderHook(() => useRccpDeliveryPlan({
      vendorAccount: 'V1',
      window,
      windowLoaded: true,
      enabled: true,
    }));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('/rccp/delivery-plan'));
    expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('vendorAccount=V1'));
  });

  it('clears the spinner when the tab is deactivated during an in-flight request', async () => {
    const { apiRequest } = await import('../utils/api');
    apiRequest.mockImplementation(() => new Promise(() => {}));
    const { useRccpDeliveryPlan } = await import('./useRccpDeliveryPlan');
    const { result, rerender } = renderHook(
      ({ enabled }) => useRccpDeliveryPlan({
        vendorAccount: 'V1',
        window,
        windowLoaded: true,
        enabled,
      }),
      { initialProps: { enabled: true } },
    );
    await waitFor(() => expect(result.current.loading).toBe(true));
    rerender({ enabled: false });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });
});
