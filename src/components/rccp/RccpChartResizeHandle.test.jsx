// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import RccpChartResizeHandle from './RccpChartResizeHandle';

function renderHandle(onResize) {
  return renderWithFluent(
    <RccpChartResizeHandle height={180} onResize={onResize} />,
  );
}

describe('RccpChartResizeHandle', () => {
  it('exposes a horizontal separator for the divider between chart and matrix', () => {
    const { container } = renderHandle(() => {});
    const handle = container.querySelector('[role="separator"]');
    expect(handle).toBeTruthy();
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    expect(handle.getAttribute('aria-valuenow')).toBe('180');
  });

  it('grows the chart height when dragged downward', () => {
    const onResize = vi.fn();
    const { container } = renderHandle(onResize);
    const handle = container.querySelector('[role="separator"]');
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn(() => false);
    handle.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 140, pointerId: 1 });
    expect(onResize).toHaveBeenCalledWith(220);

    fireEvent.pointerUp(handle, { pointerId: 1 });
  });

  it('resizes with the arrow keys for keyboard accessibility', () => {
    const onResize = vi.fn();
    const { container } = renderHandle(onResize);
    const handle = container.querySelector('[role="separator"]');

    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(onResize).toHaveBeenCalledWith(196);

    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(onResize).toHaveBeenCalledWith(164);
  });
});
