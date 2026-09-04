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

  it('loads the personal table zoom for the signed-in user', async () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <AdminGeneralSettings />
      </FluentProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('90%')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /Table zoom/i })).toBeTruthy();
    expect(apiRequest).toHaveBeenCalledWith('/auth/po-table-zoom');
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });
});
