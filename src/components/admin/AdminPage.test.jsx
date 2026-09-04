import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminPage from './AdminPage';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./AdminGeneralSettings', () => ({ default: () => <div>General panel</div> }));
vi.mock('./UsersManagement', () => ({ default: () => <div>Users panel</div> }));
vi.mock('./UserAnalytics', () => ({ default: () => <div>Analytics panel</div> }));
vi.mock('./AdminODataSettings', () => ({ default: () => <div>OData panel</div> }));
vi.mock('./datamodel', () => ({ AdminDataModel: () => <div>Data model panel</div> }));
vi.mock('./datamodel/ExcelLinkWizard', () => ({ default: () => <div>Links panel</div> }));
vi.mock('./PasswordResetEmailTemplateSettings', () => ({ default: () => <div>Mail panel</div> }));
vi.mock('./AdminTrackChangesSettings', () => ({ default: () => <div>Track panel</div> }));
vi.mock('./AdminD365Refresh', () => ({ default: () => <div>Refresh panel</div> }));

import { useAuth } from '../../context/AuthContext';

function renderPage() {
  return render(
    <FluentProvider theme={webLightTheme}>
      <AdminPage />
    </FluentProvider>
  );
}

describe('AdminPage settings audience', () => {
  it('shows only General to vendors', () => {
    useAuth.mockReturnValue({ user: { role: 'supplier' } });
    renderPage();
    expect(screen.getByRole('button', { name: /General/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Users/i })).toBeNull();
  });

  it('shows only the bijlage-visible tabs for employees', () => {
    useAuth.mockReturnValue({ user: { role: 'employee' } });
    renderPage();
    expect(screen.queryByRole('button', { name: /Users/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Analytics/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /External links/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Mail template/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /OData/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Data model/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /D365 refresh/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Track changes/i })).toBeNull();
  });
});
