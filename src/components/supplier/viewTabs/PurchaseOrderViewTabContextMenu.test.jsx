import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import PurchaseOrderViewTabContextMenu from './PurchaseOrderViewTabContextMenu';

describe('PurchaseOrderViewTabContextMenu', () => {
  it('toont groepskleur en prefix/suffix voor een extra tab', () => {
    const onOpenAffix = vi.fn();
    render(
      <FluentProvider theme={webLightTheme}>
        <PurchaseOrderViewTabContextMenu
          open
          x={40}
          y={40}
          tabId="tab_1"
          extraTabs={[{
            id: 'tab_1',
            name: 'Open',
            groupColumnKey: 'status',
            extraFilters: { status: { operator: 'equals', value: 'Open' } },
          }]}
          groups={[{ columnKey: 'status', color: '#00c875' }]}
          columns={[{ key: 'status', label: 'Status' }]}
          canManage
          onOpenChange={vi.fn()}
          onRemoveTab={vi.fn()}
          onSetGroupColor={vi.fn()}
          onOpenAffix={onOpenAffix}
        />
      </FluentProvider>
    );

    expect(screen.getByRole('menuitem', { name: 'Group color' })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Prefix and suffix…' }));
    expect(onOpenAffix).toHaveBeenCalledWith('status');
    expect(screen.getByRole('menuitem', { name: 'This tab only' })).toBeTruthy();
  });
});
