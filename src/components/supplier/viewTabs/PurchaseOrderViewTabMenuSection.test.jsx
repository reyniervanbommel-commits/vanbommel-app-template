import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button, FluentProvider, Menu, MenuList, MenuPopover, MenuTrigger, webLightTheme } from '@fluentui/react-components';
import PurchaseOrderViewTabMenuSection from './PurchaseOrderViewTabMenuSection';
import ViewTabsDialogsProvider from './ViewTabsDialogsProvider';

function renderTabMenu({ groups = [] } = {}) {
  render(
    <FluentProvider theme={webLightTheme}>
      <ViewTabsDialogsProvider
        viewTabs={{ addBlankTab: vi.fn(), addTabsFromColumn: vi.fn(), groups, uniqueValueCount: () => 1 }}
        columns={[{ key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' }]}
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
                groups={groups}
                columns={[{ key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' }]}
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
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Tabs from column…' }));
    expect(await screen.findByText('Create tabs from a column')).toBeTruthy();
  });

  it('zet groepskleuren in een nested Group colors-menu', async () => {
    renderTabMenu({
      groups: [
        { columnKey: 'status', color: '#00c875' },
        { columnKey: 'amount', color: '#579bfc' },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Views' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Group colors' }));
    expect(await screen.findByRole('menuitem', { name: 'Status' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Amount' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: /Group color:/ })).toBeNull();
  });
});
