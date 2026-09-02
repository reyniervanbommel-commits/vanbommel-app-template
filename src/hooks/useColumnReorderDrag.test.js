import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useColumnReorderDrag } from './useColumnReorderDrag';

function startEvent() {
  return {
    dataTransfer: {
      effectAllowed: '',
      setData: vi.fn(),
    },
  };
}

function dropEvent(sourceKey, clientX = 80) {
  return {
    preventDefault: vi.fn(),
    clientX,
    currentTarget: {
      getBoundingClientRect: () => ({ left: 0, width: 100 }),
      contains: () => false,
    },
    dataTransfer: {
      getData: () => sourceKey,
    },
  };
}

describe('useColumnReorderDrag', () => {
  it('wist draggingKey direct bij drop, ook als onReorder nog wacht', async () => {
    let release;
    const onReorder = vi.fn(() => new Promise((resolve) => {
      release = resolve;
    }));
    const { result } = renderHook(() => useColumnReorderDrag({ onReorder }));

    act(() => {
      result.current.getCellDragProps('status').onDragStart(startEvent());
    });
    expect(result.current.draggingKey).toBe('status');

    act(() => {
      void result.current.getCellDragProps('vendor').onDrop(dropEvent('status'));
    });

    expect(result.current.draggingKey).toBe('');
    release();
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('wist draggingKey als drag tijdens persist wordt uitgezet', () => {
    const onReorder = vi.fn();
    const { result, rerender } = renderHook(
      ({ disabled }) => useColumnReorderDrag({ onReorder, disabled }),
      { initialProps: { disabled: false } }
    );

    act(() => {
      result.current.getCellDragProps('status').onDragStart(startEvent());
    });
    expect(result.current.draggingKey).toBe('status');

    rerender({ disabled: true });
    expect(result.current.draggingKey).toBe('');
  });
});
