import { describe, it, expect, afterEach, vi } from 'vitest';
import { mockFetchSequence } from '../test-utils/mockApi';
import { apiRequest } from './api';
import {
  resetSessionExpiredHandler,
  SESSION_END_REASON,
  setSessionExpiredHandler,
} from './sessionExpiry';

afterEach(() => {
  vi.unstubAllGlobals();
  resetSessionExpiredHandler();
});

describe('apiRequest', () => {
  it('roept fetch aan met het /api-prefix, credentials en JSON-headers', async () => {
    const fetchMock = mockFetchSequence([{ status: 200, body: { ok: true } }]);

    await apiRequest('/purchase-orders', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledWith('/api/purchase-orders', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('serialiseert options.body als JSON', async () => {
    const fetchMock = mockFetchSequence([{ status: 200, body: {} }]);

    await apiRequest('/purchase-orders/1', { method: 'PUT', body: { status: 'done' } });

    expect(fetchMock).toHaveBeenCalledWith('/api/purchase-orders/1', expect.objectContaining({
      body: JSON.stringify({ status: 'done' }),
    }));
  });

  it('gebruikt GET als default method zonder options', async () => {
    const fetchMock = mockFetchSequence([{ status: 200, body: {} }]);

    await apiRequest('/purchase-orders');

    expect(fetchMock).toHaveBeenCalledWith('/api/purchase-orders', expect.objectContaining({ method: 'GET' }));
  });

  it('geeft de geparste JSON-body terug bij een succesvolle response', async () => {
    mockFetchSequence([{ status: 200, body: { id: 1, status: 'open' } }]);

    const data = await apiRequest('/purchase-orders/1');

    expect(data).toEqual({ id: 1, status: 'open' });
  });

  it('gooit een fout met .status en .data bij een non-2xx response', async () => {
    mockFetchSequence([{ status: 403, body: { error: 'Access denied' } }]);

    await expect(apiRequest('/admin/users')).rejects.toMatchObject({
      message: 'Access denied',
      status: 403,
      data: { error: 'Access denied' },
    });
  });

  it('gebruikt een generieke foutmelding voor een 503 zonder error-veld', async () => {
    mockFetchSequence([{ status: 503, body: {} }]);

    await expect(apiRequest('/purchase-orders')).rejects.toMatchObject({
      message: 'Service unavailable',
      status: 503,
    });
  });

  it('gebruikt een generieke "Request failed" fout voor overige non-2xx zonder error-veld', async () => {
    mockFetchSequence([{ status: 500, body: {} }]);

    await expect(apiRequest('/purchase-orders')).rejects.toMatchObject({
      message: 'Request failed',
      status: 500,
    });
  });

  it('meldt een 401 op een beschermde route als verlopen sessie', async () => {
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    mockFetchSequence([{ status: 401, body: { error: 'Not authenticated' } }]);

    await expect(apiRequest('/purchase-orders')).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledWith(SESSION_END_REASON.EXPIRED);
  });

  it('meldt geen 401 op auth-routes', async () => {
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    mockFetchSequence([{ status: 401, body: { error: 'Invalid credentials' } }]);

    await expect(apiRequest('/auth/login', { method: 'POST', body: {} }))
      .rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('gooit alsnog een status-fout als de foutresponse geen geldige JSON-body heeft', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => { throw new Error('invalid json'); },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/purchase-orders')).rejects.toMatchObject({ status: 400 });
  });
});
