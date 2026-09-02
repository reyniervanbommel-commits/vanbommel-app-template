import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { resetPoTableZoomStoreForTests } from '../../utils/poTableZoom';
import AppShellHeader from './AppShellHeader';

afterEach(() => {
  resetPoTableZoomStoreForTests();
  window.localStorage.clear();
});

const headerProps = {
  sidebarOpen: true,
  onToggleSidebar: () => {},
  isDarkMode: false,
  onToggleTheme: () => {},
  user: { email: 'ada@example.com', display_name: 'Ada', role: 'staff' },
  userMenuOpen: true,
  onToggleUserMenu: () => {},
  onCloseUserMenu: () => {},
  canAccessAdmin: false,
  onNavigateAdmin: () => {},
  onLogout: () => {},
};

describe('AppShellHeader table zoom', () => {
  it('puts the table zoom control in the avatar menu', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <AppShellHeader {...headerProps} />
      </FluentProvider>
    );

    expect(screen.getByText('Table zoom')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Table zoom' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeTruthy();
  });
});
