import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import PurchaseOrderCreateTabsDialog from './PurchaseOrderCreateTabsDialog';

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('PurchaseOrderCreateTabsDialog', () => {
  it('waarschuwt wanneer een kolom meer dan 10 tabs maakt', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <PurchaseOrderCreateTabsDialog
          open
          columns={[{ key: 'status', label: 'Status' }]}
          uniqueValueCount={() => 12}
          onOpenChange={vi.fn()}
          onSubmit={vi.fn()}
        />
      </FluentProvider>
    );
    expect(screen.getByText(/This column will create 12 tabs/)).toBeTruthy();
  });

  it('toont geen waarschuwing bij 10 of minder tabs', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <PurchaseOrderCreateTabsDialog
          open
          columns={[{ key: 'status', label: 'Status' }]}
          uniqueValueCount={() => 10}
          onOpenChange={vi.fn()}
          onSubmit={vi.fn()}
        />
      </FluentProvider>
    );
    expect(screen.queryByText(/This column will create/)).toBeNull();
  });
});
