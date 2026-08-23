import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePurchaseOrderRefreshProgress } from './usePurchaseOrderRefreshProgress';

vi.mock('../utils/api', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '../utils/api';

describe('usePurchaseOrderRefreshProgress', () => {
  beforeEach(() => {
    apiRequest.mockResolvedValue({
      running: false,
      progress: { status: 'idle' },
      run: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('pollt niet wanneer enabled false is', async () => {
    renderHook(() => usePurchaseOrderRefreshProgress({ enabled: false }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('checkt eenmaal bij mount en herlaadt niet als er geen run loopt', async () => {
    const onAttachedRunFinishedRef = { current: vi.fn() };
    renderHook(() => usePurchaseOrderRefreshProgress({
      enabled: true,
      onAttachedRunFinishedRef,
    }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(apiRequest).toHaveBeenCalledWith('/data/purchase-orders/refresh/progress');
    expect(onAttachedRunFinishedRef.current).not.toHaveBeenCalled();
  });
});
