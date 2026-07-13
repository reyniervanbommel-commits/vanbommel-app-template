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
});
