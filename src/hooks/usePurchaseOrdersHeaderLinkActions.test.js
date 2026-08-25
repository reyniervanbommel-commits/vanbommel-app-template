import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePurchaseOrdersHeaderLinkActions } from './usePurchaseOrdersHeaderLinkActions';

function setup(overrides = {}) {
  const addHeaderColumnAfter = vi.fn(async () => ({ key: 'receipt_date_values' }));
  const addLineValueHeaderLink = vi.fn(async () => {});
  const addLineTotalHeaderLink = vi.fn(async () => {});
  const reload = vi.fn(async () => {});
  const setEditingColumnKey = vi.fn();
  const setLineColumnTotal = vi.fn(async () => {});
  const { result } = renderHook(() => usePurchaseOrdersHeaderLinkActions({
    lineTotalHeaderLinks: [],
    lineValueHeaderLinks: [],
    visibleHeaderColumns: [{ key: 'status' }],
    lineTotalColumns: [],
    addHeaderColumnAfter,
    addLineTotalHeaderLink,
    addLineValueHeaderLink,
    setLineColumnTotal,
    setEditingColumnKey,
    reload,
    ...overrides,
  }));
  return {
    result,
    addHeaderColumnAfter,
    addLineValueHeaderLink,
    addLineTotalHeaderLink,
    reload,
    setEditingColumnKey,
  };
}

describe('usePurchaseOrdersHeaderLinkActions', () => {
  it('herlaadt het board na push values zodat de nieuwe header-kolom meteen waarden toont', async () => {
    const hooks = setup();
    const lineColumn = { key: 'receiptDate', label: 'Receipt date' };

    await act(async () => {
      await hooks.result.current.handlePushLineValuesToHeader(lineColumn);
    });

    expect(hooks.addLineValueHeaderLink).toHaveBeenCalledWith({
      lineColumnKey: 'receiptDate',
      headerColumnKey: 'receipt_date_values',
    });
    expect(hooks.reload).toHaveBeenCalledTimes(1);
    expect(hooks.reload.mock.invocationCallOrder[0])
      .toBeGreaterThan(hooks.addLineValueHeaderLink.mock.invocationCallOrder[0]);
    expect(hooks.setEditingColumnKey).toHaveBeenCalledWith('receipt_date_values');
  });

  it('herlaadt het board na push total', async () => {
    const hooks = setup({
      addHeaderColumnAfter: vi.fn(async () => ({ key: 'qty_total' })),
    });

    await act(async () => {
      await hooks.result.current.handlePushLineTotalToHeader({ key: 'qty', label: 'Qty' });
    });

    expect(hooks.addLineTotalHeaderLink).toHaveBeenCalledWith({
      lineColumnKey: 'qty',
      headerColumnKey: 'qty_total',
    });
    expect(hooks.reload).toHaveBeenCalledTimes(1);
  });

  it('herlaadt niet wanneer de koppeling al bestaat', async () => {
    const hooks = setup({
      lineValueHeaderLinks: [{ lineColumnKey: 'receiptDate', headerColumnKey: 'existing' }],
    });

    await act(async () => {
      await hooks.result.current.handlePushLineValuesToHeader({ key: 'receiptDate', label: 'Receipt date' });
    });

    expect(hooks.addHeaderColumnAfter).not.toHaveBeenCalled();
    expect(hooks.reload).not.toHaveBeenCalled();
    expect(hooks.setEditingColumnKey).toHaveBeenCalledWith('existing');
  });
});
