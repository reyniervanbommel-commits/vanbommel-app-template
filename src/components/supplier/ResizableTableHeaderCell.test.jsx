import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResizableTableHeaderCell from './ResizableTableHeaderCell';

function renderHeaderCell(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <table>
        <thead>
          <tr>
            <ResizableTableHeaderCell columnKey="order" {...props}>
              Order
            </ResizableTableHeaderCell>
          </tr>
        </thead>
      </table>
    </FluentProvider>
  );
}

describe('ResizableTableHeaderCell', () => {
  it('derives an unstored resize width from the scaled visual width', () => {
    const onResizeEnd = vi.fn();
    renderHeaderCell({ getScale: () => 0.75, onResizeEnd });
    const cell = screen.getByRole('columnheader');
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue({ width: 150 });

    fireEvent.mouseDown(screen.getByRole('separator'), { clientX: 200 });
    fireEvent.mouseUp(window, { clientX: 200 });

    expect(onResizeEnd).toHaveBeenCalledWith('order', 200);
  });

  it('keeps a finite stored width as the resize start', () => {
    const onResizeEnd = vi.fn();
    renderHeaderCell({ width: 240, getScale: () => 0.75, onResizeEnd });
    const cell = screen.getByRole('columnheader');
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue({ width: 150 });

    fireEvent.mouseDown(screen.getByRole('separator'), { clientX: 200 });
    fireEvent.mouseUp(window, { clientX: 200 });

    expect(onResizeEnd).toHaveBeenCalledWith('order', 240);
  });
});
