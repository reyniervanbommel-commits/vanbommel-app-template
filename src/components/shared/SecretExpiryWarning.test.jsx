// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import SecretExpiryWarning from './SecretExpiryWarning';
import { apiRequest } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../utils/api', () => ({ apiRequest: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

// jsdom kent geen ResizeObserver; Fluent's MessageBar-reflow heeft hem wel nodig.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const renderWarning = () =>
  render(
    <FluentProvider theme={webLightTheme}>
      <SecretExpiryWarning />
    </FluentProvider>,
  );

const expiryResponse = (clientSecretExpiry) => ({ derived: { clientSecretExpiry } });

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  useAuth.mockReturnValue({ user: { role: 'admin' } });
});

describe('SecretExpiryWarning', () => {
  it('toont banner en dialog als de secret binnen 30 dagen verloopt', async () => {
    apiRequest.mockResolvedValue(
      expiryResponse({ status: 'warning', daysRemaining: 12, expiresAt: '2026-07-31T11:12:01Z' }),
    );

    renderWarning();

    const headlines = await screen.findAllByText(/expires in 12 days/i);
    expect(headlines.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /understood/i })).toBeTruthy();
  });

  it('toont niets voor een niet-admin', async () => {
    useAuth.mockReturnValue({ user: { role: 'supplier' } });
    apiRequest.mockResolvedValue(expiryResponse({ status: 'warning', daysRemaining: 5, expiresAt: '2026-07-24T00:00:00Z' }));

    const { container } = renderWarning();

    await waitFor(() => expect(apiRequest).not.toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('toont niets als de secret nog lang geldig is', async () => {
    apiRequest.mockResolvedValue(
      expiryResponse({ status: 'ok', daysRemaining: 730, expiresAt: '2028-07-19T11:12:01Z' }),
    );

    const { container } = renderWarning();

    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent).toBe(''));
  });

  it('meldt een verlopen secret als fout', async () => {
    apiRequest.mockResolvedValue(
      expiryResponse({ status: 'expired', daysRemaining: -3, expiresAt: '2026-07-16T00:00:00Z' }),
    );

    renderWarning();

    const headlines = await screen.findAllByText(/has expired/i);
    expect(headlines.length).toBeGreaterThan(0);
  });

  it('toont de dialog niet opnieuw binnen dezelfde sessie, maar de banner blijft staan', async () => {
    window.sessionStorage.setItem('vendorportal.d365-secret-expiry-dismissed.2026-07-31T11:12:01Z', '1');
    apiRequest.mockResolvedValue(
      expiryResponse({ status: 'warning', daysRemaining: 12, expiresAt: '2026-07-31T11:12:01Z' }),
    );

    renderWarning();

    await screen.findByText(/expires in 12 days/i);
    expect(screen.queryByRole('button', { name: /understood/i })).toBeNull();
  });

  it('blijft stil als de statuscheck faalt', async () => {
    apiRequest.mockRejectedValue(new Error('boom'));

    const { container } = renderWarning();

    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent).toBe(''));
  });
});
