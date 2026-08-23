import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useD365Refresh } from './useD365Refresh';

vi.mock('../utils/api', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '../utils/api';

describe('useD365Refresh', () => {
  beforeEach(() => {
    apiRequest.mockImplementation(async (path) => {
      if (String(path).includes('/runs')) return { runs: [] };
      if (String(path).includes('alert-emails')) return { emails: ['ops@example.com'] };
      return {
        running: false,
        progress: { status: 'idle', fetched: 0, saved: 0, lookupWarnings: [] },
        run: { currentLabel: '', overall: 0, entityIndex: 0, entityCount: 0, entities: [] },
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('laadt live, historie en e-mails eenmaal bij mount', async () => {
    const { result } = renderHook(() => useD365Refresh());
    await act(async () => {
      await Promise.resolve();
    });
    expect(apiRequest).toHaveBeenCalledWith('/data/purchase-orders/refresh/progress?view=full');
    expect(apiRequest).toHaveBeenCalledWith('/admin/d365-refresh/runs?limit=20');
    expect(result.current.emails).toEqual(['ops@example.com']);
  });
});
