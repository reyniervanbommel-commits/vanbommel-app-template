import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FluentProvider, Menu, MenuList, MenuPopover, MenuTrigger, Button, webLightTheme } from '@fluentui/react-components';
import PurchaseOrderUpdateCurrentViewItem from './PurchaseOrderUpdateCurrentViewItem';

describe('PurchaseOrderUpdateCurrentViewItem', () => {
  it('berekent de diff pas bij hover op het haakje, niet bij render of rij-hover', async () => {
    const getUnsavedViewDiff = vi.fn(() => ({
      rows: [{ kind: 'filter', label: 'Filter added:', detail: 'Status is exactly Open' }],
      moreCount: 0,
    }));

    render(
      <FluentProvider theme={webLightTheme}>
        <Menu open>
          <MenuTrigger disableButtonEnhancement>
            <Button>Views</Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <PurchaseOrderUpdateCurrentViewItem
                getUnsavedViewDiff={getUnsavedViewDiff}
                onClick={() => {}}
              />
            </MenuList>
          </MenuPopover>
        </Menu>
      </FluentProvider>
    );

    expect(screen.getByText('Update current view')).toBeTruthy();
    expect(getUnsavedViewDiff).not.toHaveBeenCalled();

    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: /update current view/i }));
    expect(getUnsavedViewDiff).not.toHaveBeenCalled();

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Show unsaved view changes' }));
    expect(getUnsavedViewDiff).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Status is exactly Open')).toBeTruthy();

    fireEvent.mouseLeave(screen.getByRole('button', { name: 'Show unsaved view changes' }));
    fireEvent.mouseEnter(screen.getByRole('note'));
    expect(screen.getByText('Status is exactly Open')).toBeTruthy();
  });
});
