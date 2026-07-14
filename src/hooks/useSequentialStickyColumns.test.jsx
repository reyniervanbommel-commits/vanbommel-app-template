import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSequentialStickyColumns } from './useSequentialStickyColumns';

const columns = [{ key: 'order' }, { key: 'supplier' }, { key: 'status' }];

describe('useSequentialStickyColumns', () => {
  it('adds only adjacent sticky columns and supports removing the last one', () => {
    const { result } = renderHook(() => useSequentialStickyColumns({
      columns,
      headerColumnWidths: {},
      wrapperRef: { current: null },
    }));

    act(() => {
      expect(result.current.makeColumnSticky('status')).toBe(false);
      expect(result.current.makeColumnSticky('order')).toBe(true);
    });
    act(() => {
      expect(result.current.makeColumnSticky('supplier')).toBe(true);
    });
    expect(result.current.stickyColumnKeys).toEqual(['order', 'supplier']);

    act(() => {
      expect(result.current.makeColumnSticky('supplier')).toBe(true);
    });
    expect(result.current.stickyColumnKeys).toEqual(['order']);
  });

  it('offsets sticky columns after the control column width', () => {
    const { result } = renderHook(() => useSequentialStickyColumns({
      columns,
      headerColumnWidths: { order: 120, supplier: 140 },
      wrapperRef: { current: null },
    }));

    act(() => {
      result.current.makeColumnSticky('order');
    });
    act(() => {
      result.current.makeColumnSticky('supplier');
    });

    expect(result.current.decoratedColumns[0].stickyLeft).toBe(92);
    expect(result.current.decoratedColumns[1].stickyLeft).toBe(212);
  });
});
