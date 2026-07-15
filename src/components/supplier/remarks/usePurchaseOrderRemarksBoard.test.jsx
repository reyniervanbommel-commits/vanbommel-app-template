// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRemarksSummary } from './useRemarksSummary';
import { usePurchaseOrderRemarksBoard } from './usePurchaseOrderRemarksBoard';

vi.mock('./useRemarksSummary', () => ({ useRemarksSummary: vi.fn() }));

describe('usePurchaseOrderRemarksBoard', () => {
  it('deelt summaries met het board en opent de juiste rij en kolom', () => {
    const summaryByRow = new Map([['USMF\u0000PO-1', { count: 2 }]]);
    useRemarksSummary.mockReturnValue({
      summaryByRow,
      loading: false,
      error: '',
      refresh: vi.fn(),
      updateRow: vi.fn(),
    });
    const currentUser = { id: 7, displayName: 'Test User' };
    const columns = [{ id: 12, key: 'status', label: 'Status' }];
    const opener = document.createElement('button');
    const { result } = renderHook(() =>
      usePurchaseOrderRemarksBoard({
        enabled: true,
        currentUser,
        columns,
      })
    );

    expect(result.current.tableState.summaryByRow).toBe(summaryByRow);
    expect(result.current.panelProps.open).toBe(false);

    act(() => {
      result.current.tableState.open(
        { dataAreaId: 'USMF', orderNumber: 'PO-1' },
        columns[0],
        opener
      );
    });

    expect(result.current.panelProps).toMatchObject({
      open: true,
      row: { partitionKey: 'USMF', recordKey: 'PO-1' },
      initialColumn: columns[0],
      currentUser,
      columns,
    });
    expect(result.current.panelProps.openerRef.current).toBe(opener);

    act(() => result.current.panelProps.onClose());
    expect(result.current.panelProps.open).toBe(false);
  });

  it('stuurt een locate request wanneer onLocateRow wordt aangeroepen', () => {
    useRemarksSummary.mockReturnValue({
      summaryByRow: new Map(),
      loading: false,
      error: '',
      refresh: vi.fn(),
      updateRow: vi.fn(),
    });
    const { result } = renderHook(() =>
      usePurchaseOrderRemarksBoard({
        enabled: true,
        currentUser: { id: 1 },
        columns: [],
      })
    );

    act(() => {
      result.current.tableState.open({ dataAreaId: 'USMF', orderNumber: 'PO-9' }, null, null);
    });

    act(() => {
      result.current.panelProps.onLocateRow();
    });

    expect(result.current.tableState.locateRequest).toMatchObject({
      partitionKey: 'USMF',
      recordKey: 'PO-9',
      seq: 1,
    });
  });
});
