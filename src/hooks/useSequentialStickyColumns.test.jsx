import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSequentialStickyColumns } from './useSequentialStickyColumns';
import { PURCHASE_ORDER_BOARD_CONTROL_COLUMN_WIDTH_PX } from '../components/supplier/purchaseOrderBoardLayout';

const columns = [{ key: 'order' }, { key: 'supplier' }, { key: 'status' }];
const zoomScale = 0.85;
const getZoomScale = () => zoomScale;

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

  it('scales stored fallback widths without rescaling visual measurements', () => {
    const wrapperRef = {
      current: {
        querySelector: (selector) => {
          if (selector === 'thead') return null;
          if (selector === '[data-col-key="order"]') {
            return { getBoundingClientRect: () => ({ width: 68 }) };
          }
          return null;
        },
      },
    };
    const { result } = renderHook(() => useSequentialStickyColumns({
      columns,
      headerColumnWidths: {},
      wrapperRef,
      getScale: getZoomScale,
    }));

    act(() => {
      result.current.makeColumnSticky('order');
    });
    act(() => {
      result.current.makeColumnSticky('supplier');
    });

    const supplier = result.current.decoratedColumns.find((column) => column.key === 'supplier');
    expect(supplier.stickyLeft).toBeCloseTo(
      (PURCHASE_ORDER_BOARD_CONTROL_COLUMN_WIDTH_PX + 80) * zoomScale
    );
  });

  it('scales only the control fallback when measured column widths are visual pixels', () => {
    const measuredWidths = { order: 68, supplier: 85 };
    const head = {
      querySelector: (selector) => {
        if (selector === 'th') {
          return { getBoundingClientRect: () => ({ width: 0 }) };
        }
        const key = selector.match(/data-col-key="([^"]+)"/)?.[1];
        return key
          ? { getBoundingClientRect: () => ({ width: measuredWidths[key] }) }
          : null;
      },
    };
    const wrapperRef = {
      current: {
        querySelector: (selector) => (selector === 'thead' ? head : null),
      },
    };
    const { result } = renderHook(() => useSequentialStickyColumns({
      columns,
      headerColumnWidths: {},
      wrapperRef,
      stickyColumnKeys: ['order', 'supplier'],
      getScale: getZoomScale,
    }));

    const order = result.current.decoratedColumns.find((column) => column.key === 'order');
    const supplier = result.current.decoratedColumns.find((column) => column.key === 'supplier');
    const scaledControlWidth = PURCHASE_ORDER_BOARD_CONTROL_COLUMN_WIDTH_PX * zoomScale;
    expect(order.stickyLeft).toBeCloseTo(scaledControlWidth);
    expect(supplier.stickyLeft).toBeCloseTo(scaledControlWidth + measuredWidths.order);
  });
});
