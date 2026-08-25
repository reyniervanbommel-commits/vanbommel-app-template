import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePurchaseOrdersBoardLineLinks } from './usePurchaseOrdersBoardLineLinks';

describe('usePurchaseOrdersBoardLineLinks', () => {
  it('maps valid total and value links while ignoring incomplete links', () => {
    const { result } = renderHook(() => usePurchaseOrdersBoardLineLinks({
      lineTotalHeaderLinks: [
        { headerColumnKey: 'total', lineColumnKey: 'quantity' },
        { headerColumnKey: 'ignored' },
      ],
      lineValueHeaderLinks: [
        { headerColumnKey: 'items', lineColumnKey: 'itemNumber' },
        { headerColumnKey: 'missing', lineColumnKey: 'unknown' },
      ],
      lineColumns: [
        { key: 'quantity', dataType: 'number' },
        { key: 'itemNumber', dataType: 'text' },
      ],
    }));

    expect(result.current.linkedLineTotalByHeaderKey).toEqual({ total: 'quantity' });
    expect(result.current.linkedLineValueByHeaderKey).toEqual({
      items: { lineColumnKey: 'itemNumber', lineDataType: 'text', lineColumnLabel: '' },
      missing: { lineColumnKey: 'unknown', lineDataType: 'text', lineColumnLabel: '' },
    });
  });
});
