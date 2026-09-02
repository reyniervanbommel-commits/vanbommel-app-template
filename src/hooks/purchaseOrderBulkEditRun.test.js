import { describe, expect, it, vi } from 'vitest';
import { valuesEqual, runCorrectRows } from './purchaseOrderBulkEditRun';

describe('valuesEqual', () => {
  it('trekt undefined en null gelijk', () => {
    expect(valuesEqual(undefined, null)).toBe(true);
  });

  it('vergelijkt via string-coercie als Object.is faalt', () => {
    expect(valuesEqual(1, '1')).toBe(true);
  });
});

describe('runCorrectRows', () => {
  const payload = { columnId: 9, columnKey: 'status', value: 'Closed' };

  it('gaat door na een fout op rij 2 van 3', async () => {
    const runSingleUpdate = vi.fn()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('conflict on PO2'))
      .mockResolvedValueOnce();
    const result = await runCorrectRows({
      candidates: [
        { dataAreaId: 'USMF', orderNumber: 'PO1', currentValue: 'Open' },
        { dataAreaId: 'USMF', orderNumber: 'PO2', currentValue: 'Open' },
        { dataAreaId: 'USMF', orderNumber: 'PO3', currentValue: 'Open' },
      ],
      payload,
      runSingleUpdate,
    });
    expect(runSingleUpdate).toHaveBeenCalledTimes(3);
    expect(result.updated).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.failedRows).toEqual([
      expect.objectContaining({
        key: 'USMF|PO2',
        orderNumber: 'PO2',
        basedOnValue: 'Open',
        errorMessage: 'conflict on PO2',
      }),
    ]);
  });

  it('slaat rijen over die al gelijk zijn en roept onSettled per kandidaat', async () => {
    const onSettled = vi.fn();
    const runSingleUpdate = vi.fn().mockResolvedValue();
    const result = await runCorrectRows({
      candidates: [
        { dataAreaId: 'USMF', orderNumber: 'PO1', currentValue: 'Closed' },
        { dataAreaId: 'USMF', orderNumber: 'PO2', currentValue: 'Open' },
      ],
      payload,
      runSingleUpdate,
      onSettled,
    });
    expect(result.skipped).toBe(1);
    expect(result.updated).toBe(1);
    expect(runSingleUpdate).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(2);
  });

  it('roept onRowStart alleen voor rijen die echt schrijven', async () => {
    const onRowStart = vi.fn();
    const onSettled = vi.fn();
    await runCorrectRows({
      candidates: [
        { dataAreaId: 'USMF', orderNumber: 'PO1', currentValue: 'Closed' },
        { dataAreaId: 'USMF', orderNumber: 'PO2', currentValue: 'Open' },
      ],
      payload,
      runSingleUpdate: vi.fn().mockResolvedValue(),
      onRowStart,
      onSettled,
    });
    expect(onRowStart).toHaveBeenCalledTimes(1);
    expect(onRowStart).toHaveBeenCalledWith('USMF|PO2');
    expect(onSettled).toHaveBeenNthCalledWith(1, { key: 'USMF|PO1', outcome: 'skipped' });
    expect(onSettled).toHaveBeenNthCalledWith(2, { key: 'USMF|PO2', outcome: 'updated' });
  });
});
