import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button, FluentProvider, Menu, MenuList, MenuPopover, MenuTrigger, webLightTheme } from '@fluentui/react-components';
import PurchaseOrderViewTabMenuSection from './PurchaseOrderViewTabMenuSection';
import ViewTabsDialogsProvider from './ViewTabsDialogsProvider';

function renderTabMenu() {
  render(
    <FluentProvider theme={webLightTheme}>
      <ViewTabsDialogsProvider
        viewTabs={{ addBlankTab: vi.fn(), addTabsFromColumn: vi.fn(), groups: [], uniqueValueCount: () => 1 }}
        columns={[{ key: 'amount', label: 'Amount' }]}
        isStaff
        activeViewId={9}
      >
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button>Views</Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <PurchaseOrderViewTabMenuSection
                enabled
                groups={[]}
                columns={[{ key: 'amount', label: 'Amount' }]}
                onSetGroupColor={vi.fn()}
              />
            </MenuList>
          </MenuPopover>
        </Menu>
      </ViewTabsDialogsProvider>
    </FluentProvider>
  );
}

describe('PurchaseOrderViewTabMenuSection dialogs', () => {
  it('houdt New tab-dialog open nadat het view-menu sluit', async () => {
    renderTabMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Views' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Tab' }));
    expect(await screen.findByText('New tab')).toBeTruthy();
  });

  it('houdt Create tabs-dialog open nadat het view-menu sluit', async () => {
    renderTabMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Views' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Tab from column…' }));
    expect(await screen.findByText('Create tabs from a column')).toBeTruthy();
  });
});
