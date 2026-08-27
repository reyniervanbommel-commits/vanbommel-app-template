// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../../../utils/api', () => ({ apiRequest: vi.fn(() => new Promise(() => {})) }));

import { apiRequest } from '../../../utils/api';
import { clearBiCache, setBiMeta } from '../../../utils/biBoardCache';
import { BOARD_KEY } from '../biConstants';
import { useBiMeta } from './useBiMeta';

describe('useBiMeta', () => {
  beforeEach(() => {
    clearBiCache();
    vi.clearAllMocks();
    apiRequest.mockImplementation(() => new Promise(() => {}));
  });

  it('paints from the prefetch cache without a loading spinner', () => {
    const cached = { columns: [{ key: 'status', dataType: 'string' }], measureColumns: [] };
    setBiMeta(BOARD_KEY, cached);

    const { result } = renderHook(() => useBiMeta(BOARD_KEY));

    expect(result.current.loading).toBe(false);
    expect(result.current.columns).toEqual(cached.columns);
    expect(result.current.measureColumns).toEqual(cached.measureColumns);
  });
});
