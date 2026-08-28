import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePurchaseOrderColumnSums } from './usePurchaseOrderColumnSums';

const COLUMNS = [
  { key: 'amount', label: 'Amount', dataType: 'number' },
  { key: 'qty', label: 'Qty', dataType: 'number' },
  { key: 'status', label: 'Status', dataType: 'text' },
  { key: 'lineQty', label: 'Line qty', dataType: 'number', level: 'line' },
];

const ROWS = [
  { order: { values: { amount: 10, qty: '2' } } },
  { order: { values: { amount: 5, qty: '3,5' } } },
];

describe('usePurchaseOrderColumnSums', () => {
  it('sums selected header number columns over filtered rows', () => {
    const { result } = renderHook(() => usePurchaseOrderColumnSums({ rows: ROWS, columns: COLUMNS }));

    act(() => {
      result.current.setColumnSumColumn('amount', true);
      result.current.setColumnSumColumn('qty', true);
    });

    expect(result.current.columnSumKeys).toEqual(['amount', 'qty']);
    expect(result.current.summedValuesByColumn).toEqual({ amount: 15, qty: 5.5 });
  });

  it('ignores line columns, reserved keys and unknown keys on apply', () => {
    const { result } = renderHook(() => usePurchaseOrderColumnSums({ rows: ROWS, columns: COLUMNS }));

    act(() => {
      result.current.applyKeys(['amount', 'lineQty', '__proto__', 'ghost', 'amount']);
    });

    expect(result.current.columnSumKeys).toEqual(['amount']);
    expect(result.current.exportKeys()).toEqual(['amount']);
  });

  it('keeps applied keys while the column catalog is still empty', () => {
    const { result, rerender } = renderHook(
      ({ columns }) => usePurchaseOrderColumnSums({ rows: ROWS, columns }),
      { initialProps: { columns: [] } },
    );

    act(() => {
      result.current.applyKeys(['amount']);
    });
    expect(result.current.columnSumKeys).toEqual(['amount']);

    rerender({ columns: COLUMNS });
    expect(result.current.columnSumKeys).toEqual(['amount']);
  });

  it('clears keys and round-trips empty apply to a stable empty array', () => {
    const { result } = renderHook(() => usePurchaseOrderColumnSums({ rows: ROWS, columns: COLUMNS }));

    act(() => {
      result.current.setColumnSumColumn('amount', true);
      result.current.clearColumnSums();
    });
    expect(result.current.columnSumKeys).toBe(result.current.exportKeys());
    expect(result.current.columnSumKeys).toEqual([]);
    expect(result.current.summedValuesByColumn).toEqual({});

    act(() => {
      result.current.applyKeys(undefined);
    });
    expect(result.current.columnSumKeys).toEqual([]);
  });
});
