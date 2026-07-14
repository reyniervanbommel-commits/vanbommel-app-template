import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePurchaseOrdersBoardLinks } from './usePurchaseOrdersBoardLinks';

describe('usePurchaseOrdersBoardLinks', () => {
  it('builds header lookups for total and value links', () => {
    const props = {
      lineColumns: [{ key: 'quantity', dataType: 'number' }],
      lineTotalHeaderLinks: [{ headerColumnKey: 'total', lineColumnKey: 'quantity' }],
      lineValueHeaderLinks: [{ headerColumnKey: 'values', lineColumnKey: 'quantity' }],
    };
    const { result } = renderHook(() => usePurchaseOrdersBoardLinks(props));

    expect(result.current.linkedLineTotalByHeaderKey).toEqual({
      total: 'quantity',
    });
    expect(result.current.linkedLineValueByHeaderKey).toEqual({
      values: { lineColumnKey: 'quantity', lineDataType: 'number' },
    });
  });

  it('ignores invalid links and keeps stable references', () => {
    const props = {
      lineColumns: [],
      lineTotalHeaderLinks: [{ headerColumnKey: '', lineColumnKey: 'missing' }],
      lineValueHeaderLinks: [{ headerColumnKey: 'values', lineColumnKey: 'missing' }],
    };
    const { result, rerender } = renderHook(() => usePurchaseOrdersBoardLinks(props));
    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
    expect(result.current.linkedLineTotalByHeaderKey).toEqual({});
    expect(result.current.linkedLineValueByHeaderKey).toEqual({});
  });
});
