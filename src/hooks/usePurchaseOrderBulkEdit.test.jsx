import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePurchaseOrderBulkEdit } from './usePurchaseOrderBulkEdit';

const COLUMNS = [{ key: 'status', label: 'Status' }];
const ORDERS = [
  { dataAreaId: 'USMF', orderNumber: 'PO1', values: { status: 'Open' } },
  { dataAreaId: 'USMF', orderNumber: 'PO2', values: { status: 'Open' } },
  { dataAreaId: 'USMF', orderNumber: 'PO3', values: { status: 'Closed' } },
];

function makeSelection(selectedKeys) {
  const keys = new Set(selectedKeys);
  return { isSelected: (key) => keys.has(key) };
}

function setup({ selectedKeys = ['USMF|PO1', 'USMF|PO2'] } = {}) {
  const saveValue = vi.fn().mockResolvedValue();
  const correctField = vi.fn().mockResolvedValue();
  const { result } = renderHook(() => usePurchaseOrderBulkEdit({
    visibleHeaderColumns: COLUMNS,
    visibleOrders: ORDERS,
    selection: makeSelection(selectedKeys),
    saveValue,
    correctField,
  }));
  return { result, saveValue, correctField };
}

describe('usePurchaseOrderBulkEdit — geen dialoog nodig', () => {
  it('past een regel-cel (lineNumber gezet) altijd direct toe, zonder dialoog', async () => {
    const { result, saveValue } = setup();
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: 1, columnKey: 'qty', value: 5 };

    await act(async () => { await result.current.handleSaveValue(payload); });

    expect(saveValue).toHaveBeenCalledWith(payload);
    expect(result.current.dialogState.open).toBe(false);
  });

  it('past een header-cel direct toe zonder dialoog als er maar 1 rij geselecteerd is', async () => {
    const { result, saveValue } = setup({ selectedKeys: ['USMF|PO1'] });
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Closed' };

    await act(async () => { await result.current.handleSaveValue(payload); });

    expect(saveValue).toHaveBeenCalledWith(payload);
    expect(result.current.dialogState.open).toBe(false);
  });

  it('past een header-cel direct toe als de bewerkte rij zelf niet in de selectie zit', async () => {
    const { result, saveValue } = setup({ selectedKeys: ['USMF|PO2', 'USMF|PO3'] });
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Closed' };

    await act(async () => { await result.current.handleSaveValue(payload); });

    expect(saveValue).toHaveBeenCalledWith(payload);
  });
});

describe('usePurchaseOrderBulkEdit — bulk-beslissingsdialoog', () => {
  it('opent de dialoog bij een header-cel-wijziging op een multi-selectie', async () => {
    const { result } = setup();
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Closed' };

    act(() => { result.current.handleSaveValue(payload); });

    expect(result.current.dialogState).toMatchObject({
      open: true,
      mode: 'confirm',
      columnLabel: 'Status',
      selectedCount: 2,
    });
  });

  it('"single" past alleen de actieve cel toe en sluit de dialoog', async () => {
    const { result, saveValue } = setup();
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Closed' };

    let pending;
    act(() => { pending = result.current.handleSaveValue(payload); });
    act(() => result.current.dialogActions.onChooseSingleCell());
    await act(async () => { await pending; });

    expect(saveValue).toHaveBeenCalledTimes(1);
    expect(saveValue).toHaveBeenCalledWith(payload);
    expect(result.current.dialogState.open).toBe(false);
  });

  it('"bulk" past de wijziging toe op alle geselecteerde rijen, slaat rijen over die al gelijk zijn', async () => {
    const { result, saveValue } = setup({ selectedKeys: ['USMF|PO1', 'USMF|PO2'] });
    // PO1 en PO2 staan beide al op 'Open' — payload.value='Open' betekent: geen van beide wijzigt.
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Open' };

    let pending;
    act(() => { pending = result.current.handleSaveValue(payload); });
    act(() => result.current.dialogActions.onChooseBulk());
    await act(async () => { await pending; });

    expect(saveValue).not.toHaveBeenCalled(); // beide rijen al gelijk → geskipt
    expect(result.current.dialogState.open).toBe(false);
  });

  it('"bulk" schrijft alleen rijen weg die daadwerkelijk wijzigen', async () => {
    const { result, saveValue } = setup({ selectedKeys: ['USMF|PO1', 'USMF|PO3'] });
    // PO1='Open'→'Closed' (wijzigt), PO3='Closed'→'Closed' (skip).
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Closed' };

    let pending;
    act(() => { pending = result.current.handleSaveValue(payload); });
    act(() => result.current.dialogActions.onChooseBulk());
    await act(async () => { await pending; });

    expect(saveValue).toHaveBeenCalledTimes(1);
    expect(saveValue).toHaveBeenCalledWith(expect.objectContaining({ orderNumber: 'PO1', value: 'Closed' }));
  });

  it('handleCorrectField gebruikt correctField i.p.v. saveValue en geeft basedOnValue mee', async () => {
    const { result, correctField, saveValue } = setup({ selectedKeys: ['USMF|PO1', 'USMF|PO3'] });
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Closed' };

    let pending;
    act(() => { pending = result.current.handleCorrectField(payload); });
    act(() => result.current.dialogActions.onChooseBulk());
    await act(async () => { await pending; });

    expect(saveValue).not.toHaveBeenCalled();
    expect(correctField).toHaveBeenCalledWith(expect.objectContaining({ orderNumber: 'PO1', basedOnValue: 'Open' }));
  });

  it('stopt bij een fout, toont een samenvatting met updated/skipped/not-attempted en verwerpt de aanroep', async () => {
    const saveValue = vi.fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('write failed'));
    const { result } = renderHook(() => usePurchaseOrderBulkEdit({
      visibleHeaderColumns: COLUMNS,
      visibleOrders: ORDERS,
      selection: makeSelection(['USMF|PO1', 'USMF|PO2', 'USMF|PO3']),
      saveValue,
      correctField: vi.fn(),
    }));
    // Alle 3 rijen wijzigen (geen 'Open'-waarde), dus geen skips vóór de fout.
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Shipped' };

    let pending;
    act(() => { pending = result.current.handleSaveValue(payload); });
    act(() => result.current.dialogActions.onChooseBulk());
    await act(async () => {
      await expect(pending).rejects.toThrow(/Updated: 1/);
    });

    expect(result.current.dialogState.mode).toBe('summary');
    expect(result.current.dialogState.open).toBe(true);
    expect(result.current.dialogState.summaryMessage).toContain('Updated: 1');
  });

  it('sluiten van de confirm-dialoog (bv. Escape) telt als "single"', async () => {
    const { result, saveValue } = setup();
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Closed' };

    let pending;
    act(() => { pending = result.current.handleSaveValue(payload); });
    act(() => result.current.dialogActions.onOpenChange(false));
    await act(async () => { await pending; });

    expect(saveValue).toHaveBeenCalledTimes(1);
  });
});

describe('usePurchaseOrderBulkEdit — correct-pad verzamelt fouten (#AB:295)', () => {
  it('gaat door na een fout op rij 2 van 3 (mode correct)', async () => {
    const correctField = vi.fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('conflict on PO2'))
      .mockResolvedValueOnce();
    const { result } = renderHook(() => usePurchaseOrderBulkEdit({
      visibleHeaderColumns: COLUMNS,
      visibleOrders: ORDERS,
      selection: makeSelection(['USMF|PO1', 'USMF|PO2', 'USMF|PO3']),
      saveValue: vi.fn(),
      correctField,
    }));
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Shipped' };
    let pending;
    act(() => { pending = result.current.handleCorrectField(payload); });
    act(() => result.current.dialogActions.onChooseBulk());
    await act(async () => { await pending; });

    expect(correctField).toHaveBeenCalledTimes(3);
    expect(result.current.dialogState.mode).toBe('summary');
    expect(result.current.dialogState.failedRows).toEqual([
      expect.objectContaining({ orderNumber: 'PO2', basedOnValue: 'Open', errorMessage: 'conflict on PO2' }),
    ]);
    expect(result.current.dialogState.summaryMessage).toMatch(/Failed: 1/);
    expect(result.current.dialogState.summaryMessage).toMatch(/Updated: 2/);
  });

  it('reject als de initiërende rij zelf faalt, ook als andere rijen slagen', async () => {
    const correctField = vi.fn()
      .mockRejectedValueOnce(new Error('locked PO1'))
      .mockResolvedValueOnce();
    const { result } = renderHook(() => usePurchaseOrderBulkEdit({
      visibleHeaderColumns: COLUMNS,
      visibleOrders: ORDERS,
      selection: makeSelection(['USMF|PO1', 'USMF|PO2']),
      saveValue: vi.fn(),
      correctField,
    }));
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Shipped' };
    let pending;
    act(() => { pending = result.current.handleCorrectField(payload); });
    act(() => result.current.dialogActions.onChooseBulk());
    await act(async () => {
      await expect(pending).rejects.toThrow('locked PO1');
    });
    expect(result.current.dialogState.failedRows).toEqual([
      expect.objectContaining({ orderNumber: 'PO1' }),
    ]);
  });

  it('resolved wanneer alléén andere rijen falen, niet de initiërende rij', async () => {
    const correctField = vi.fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('locked PO2'));
    const { result } = renderHook(() => usePurchaseOrderBulkEdit({
      visibleHeaderColumns: COLUMNS,
      visibleOrders: ORDERS,
      selection: makeSelection(['USMF|PO1', 'USMF|PO2']),
      saveValue: vi.fn(),
      correctField,
    }));
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Shipped' };
    let pending;
    act(() => { pending = result.current.handleCorrectField(payload); });
    act(() => result.current.dialogActions.onChooseBulk());
    await act(async () => { await pending; });
    expect(result.current.dialogState.failedRows[0].orderNumber).toBe('PO2');
  });

  it('retryRow haalt een geslaagde rij uit failedRows', async () => {
    const correctField = vi.fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('conflict on PO2'))
      .mockResolvedValueOnce();
    const { result } = renderHook(() => usePurchaseOrderBulkEdit({
      visibleHeaderColumns: COLUMNS,
      visibleOrders: ORDERS,
      selection: makeSelection(['USMF|PO1', 'USMF|PO2']),
      saveValue: vi.fn(),
      correctField,
    }));
    const payload = { dataAreaId: 'USMF', orderNumber: 'PO1', lineNumber: null, columnKey: 'status', value: 'Shipped' };
    let pending;
    act(() => { pending = result.current.handleCorrectField(payload); });
    act(() => result.current.dialogActions.onChooseBulk());
    await act(async () => { await pending; });

    expect(result.current.dialogState.failedRows).toHaveLength(1);
    await act(async () => { await result.current.dialogActions.onRetryRow('USMF|PO2'); });
    expect(result.current.dialogState.failedRows).toHaveLength(0);
    expect(result.current.dialogState.summaryMessage).toMatch(/Failed: 0/);
  });
});
