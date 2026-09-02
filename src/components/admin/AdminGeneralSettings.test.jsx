import React from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminGeneralSettings from './AdminGeneralSettings';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}));

vi.mock('../../utils/api', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '../../utils/api';

describe('AdminGeneralSettings', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ poTableZoom: 0.9 });
  });

  it('loads the global table zoom for admins', async () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <AdminGeneralSettings />
      </FluentProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('90%')).toBeTruthy();
    });
    expect(apiRequest).toHaveBeenCalledWith('/admin/settings/general');
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });
});
