import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { usePurchaseOrderCorrectAllLines } from './usePurchaseOrderCorrectAllLines';

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../utils/api', () => ({ apiRequest }));

describe('usePurchaseOrderCorrectAllLines', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('POSTs line columnId and patches remaining values on partial fail', async () => {
    apiRequest.mockResolvedValue({
      attempted: 2, updated: 1, skipped: 0, failed: 1,
      remainingValues: ['Green', 'Blue'],
      updatedDetailKeys: [10],
    });
    const patchLinkedLineValues = vi.fn();
    const applyLineValuesBatch = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderCorrectAllLines({
      patchLinkedLineValues, applyLineValuesBatch,
    }));
    await expect(result.current.onCorrectAllLines({
      lineColumnId: 44, lineColumnKey: 'color', headerColumnKey: 'colorValues',
      dataAreaId: 'nl01', orderNumber: 'PO-1', value: 'Green',
    })).rejects.toMatchObject({ remainingDisplayValue: 'Green' });
    expect(apiRequest).toHaveBeenCalledWith(
      '/data/purchase-orders/correct-all-details',
      expect.objectContaining({
        method: 'POST',
        body: { columnId: 44, partitionKey: 'nl01', recordKey: 'PO-1', value: 'Green' },
      }),
    );
    expect(patchLinkedLineValues).toHaveBeenCalledWith('nl01', 'PO-1', 'colorValues', ['Green', 'Blue']);
    expect(applyLineValuesBatch).toHaveBeenCalled();
    const updater = applyLineValuesBatch.mock.calls[0][2];
    expect(updater({
      lineNumber: '10',
      values: { color: 'Red' },
      historyByColumnId: {},
    })).toMatchObject({
      values: { color: 'Green' },
      historyByColumnId: { 44: true },
    });
    expect(updater({
      lineNumber: 11,
      values: { color: 'Blue' },
      historyByColumnId: {},
    })).toMatchObject({
      values: { color: 'Blue' },
      historyByColumnId: {},
    });
  });

  it('zet een history-vouw op elke bijgewerkte regel, ook bij string-keys', async () => {
    apiRequest.mockResolvedValue({
      attempted: 2, updated: 2, skipped: 0, failed: 0,
      remainingValues: ['Green'],
      updatedDetailKeys: ['10', '11'],
    });
    const applyLineValuesBatch = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderCorrectAllLines({
      patchLinkedLineValues: vi.fn(), applyLineValuesBatch,
    }));
    await result.current.onCorrectAllLines({
      lineColumnId: 44, lineColumnKey: 'color', headerColumnKey: 'colorValues',
      dataAreaId: 'nl01', orderNumber: 'PO-1', value: 'Green',
    });
    const updater = applyLineValuesBatch.mock.calls[0][2];
    expect(updater({ lineNumber: 10, values: { color: 'Red' }, historyByColumnId: {} }).historyByColumnId)
      .toEqual({ 44: true });
    expect(updater({ lineNumber: 11, values: { color: 'Blue' }, historyByColumnId: {} }).historyByColumnId)
      .toEqual({ 44: true });
  });

  it('uses remainingValues [] on empty order instead of [value]', async () => {
    apiRequest.mockResolvedValue({
      attempted: 0, updated: 0, skipped: 0, failed: 0,
      remainingValues: [],
      updatedDetailKeys: [],
    });
    const patchLinkedLineValues = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderCorrectAllLines({
      patchLinkedLineValues, applyLineValuesBatch: vi.fn(),
    }));
    await result.current.onCorrectAllLines({
      lineColumnId: 44, lineColumnKey: 'color', headerColumnKey: 'colorValues',
      dataAreaId: 'nl01', orderNumber: 'PO-1', value: 'Green',
    });
    expect(patchLinkedLineValues).toHaveBeenCalledWith('nl01', 'PO-1', 'colorValues', []);
  });
});
