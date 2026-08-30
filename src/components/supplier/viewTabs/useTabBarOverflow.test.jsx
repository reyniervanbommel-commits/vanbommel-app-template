import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useTabBarOverflow } from './useTabBarOverflow';

function OverflowHarness() {
  const { scrollerRef, isDragging } = useTabBarOverflow('tab_a|tab_b', 'tab_a');
  return (
    <div ref={scrollerRef} data-testid="scroller" data-dragging={isDragging ? '1' : '0'}>
      <button type="button" data-tab-id="tab_a">All</button>
      <button type="button" data-tab-id="tab_b">Tab 2</button>
    </div>
  );
}

function setupOverflowScroller() {
  render(<OverflowHarness />);
  const scroller = screen.getByTestId('scroller');
  Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 800 });
  Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 200 });
  Object.defineProperty(scroller, 'scrollLeft', { configurable: true, writable: true, value: 0 });
  scroller.setPointerCapture = vi.fn();
  scroller.releasePointerCapture = vi.fn();
  return { scroller, tab: screen.getByRole('button', { name: 'Tab 2' }) };
}

describe('useTabBarOverflow pointer capture', () => {
  it('zet geen pointer capture bij pointerdown zodat een tab-klik doorkomt', () => {
    const { scroller, tab } = setupOverflowScroller();
    fireEvent.pointerDown(tab, {
      pointerId: 1,
      button: 0,
      clientX: 40,
      pointerType: 'mouse',
    });
    expect(scroller.setPointerCapture).not.toHaveBeenCalled();
  });

  it('zet pointer capture pas nadat de sleepdrempel is overschreden', () => {
    const { scroller, tab } = setupOverflowScroller();
    fireEvent.pointerDown(tab, {
      pointerId: 1,
      button: 0,
      clientX: 40,
      pointerType: 'mouse',
    });
    fireEvent.pointerMove(scroller, { pointerId: 1, clientX: 43, pointerType: 'mouse' });
    expect(scroller.setPointerCapture).not.toHaveBeenCalled();
    fireEvent.pointerMove(scroller, { pointerId: 1, clientX: 52, pointerType: 'mouse' });
    expect(scroller.setPointerCapture).toHaveBeenCalledWith(1);
  });
});
