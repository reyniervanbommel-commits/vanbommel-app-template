// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../../../utils/api', () => ({ apiRequest: vi.fn(() => new Promise(() => {})) }));

import { apiRequest } from '../../../utils/api';
import { clearBiCache, setBiCharts } from '../../../utils/biBoardCache';
import { useBiCharts } from './useBiCharts';

describe('useBiCharts', () => {
  beforeEach(() => {
    clearBiCache();
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({ charts: [] });
  });

  it('paints from the prefetch cache without a loading spinner', () => {
    const cached = [{ id: 1, name: 'Open POs', config: { type: 'bar' } }];
    setBiCharts(cached);

    const { result } = renderHook(() => useBiCharts());

    expect(result.current.loading).toBe(false);
    expect(result.current.charts).toEqual(cached);
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
