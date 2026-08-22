import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PurchaseOrdersTableControls from './PurchaseOrdersTableControls';

function renderControls(props = {}) {
  const defaultProps = {
    onSetExpansion: vi.fn(),
    onOpenFlyout: vi.fn(),
  };

  return render(
    <FluentProvider theme={webLightTheme}>
      <table>
        <thead>
          <tr>
            <PurchaseOrdersTableControls {...defaultProps} {...props} />
          </tr>
        </thead>
      </table>
    </FluentProvider>
  );
}

describe('PurchaseOrdersTableControls', () => {
  it('shows the inactive filter overview button and opens the flyout when clicked', () => {
    const onOpenFlyout = vi.fn();
    renderControls({ hasActive: false, onOpenFlyout });

    const button = screen.getByRole('button', {
      name: 'Show active filters and formatting',
    });

    expect(screen.queryByRole('button', {
      name: 'Show active filters and formatting (active)',
    })).toBeNull();

    fireEvent.click(button);

    expect(onOpenFlyout).toHaveBeenCalledTimes(1);
  });

  it('marks the filter overview button active when filters or formatting are active', () => {
    renderControls({ hasActive: true });

    expect(screen.getByRole('button', {
      name: 'Show active filters and formatting (active)',
    })).toBeTruthy();
  });
});
