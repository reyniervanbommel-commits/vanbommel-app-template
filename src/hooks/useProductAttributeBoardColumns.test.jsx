import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useProductAttributeBoardColumns } from './useProductAttributeBoardColumns';
import { apiRequest } from '../utils/api';

vi.mock('../utils/api', () => ({ apiRequest: vi.fn() }));

beforeEach(() => {
  apiRequest.mockReset();
});

describe('useProductAttributeBoardColumns', () => {
  it('haalt namen op bij mount wanneer enabled', async () => {
    apiRequest.mockResolvedValue({ names: [{ name: 'Season', visible: false, columnKey: 'pav_season' }] });
    const { result } = renderHook(() => useProductAttributeBoardColumns(true));
    await waitFor(() => expect(result.current.names).toHaveLength(1));
    expect(apiRequest).toHaveBeenCalledWith('/data/product-attribute-values/board-columns');
  });

  it('doet geen GET als enabled false is', () => {
    renderHook(() => useProductAttributeBoardColumns(false));
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('POST setVisible met boolean visible true', async () => {
    apiRequest
      .mockResolvedValueOnce({ names: [{ name: 'Season', visible: false, columnKey: 'pav_season' }] })
      .mockResolvedValueOnce({ name: 'Season', visible: true, columnKey: 'pav_season' });
    const { result } = renderHook(() => useProductAttributeBoardColumns(true));
    await waitFor(() => expect(result.current.names).toHaveLength(1));
    await act(async () => {
      await result.current.setVisible('Season', true);
    });
    expect(apiRequest).toHaveBeenCalledWith('/data/product-attribute-values/board-columns', {
      method: 'POST',
      body: { attributeName: 'Season', visible: true },
    });
  });
});
