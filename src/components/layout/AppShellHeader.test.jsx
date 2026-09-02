import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppShellHeader from './AppShellHeader';

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
  it('does not put the table zoom control in the avatar menu', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <AppShellHeader {...headerProps} />
      </FluentProvider>
    );

    expect(screen.queryByText('Table zoom')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Table zoom' })).toBeNull();
  });
});
