import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getLoginReasonMessage,
  isPublicAuthPath,
  notifySessionExpired,
  resetSessionExpiredHandler,
  SESSION_END_REASON,
  setSessionExpiredHandler,
  shouldNotifyUnauthorized,
} from './sessionExpiry';

afterEach(() => {
  resetSessionExpiredHandler();
});

describe('sessionExpiry helpers', () => {
  it('herkent publieke auth-paden', () => {
    expect(isPublicAuthPath('/auth/login')).toBe(true);
    expect(isPublicAuthPath('/auth/logout?x=1')).toBe(true);
    expect(isPublicAuthPath('/purchase-orders')).toBe(false);
  });

  it('meldt 401 alleen buiten auth-routes', () => {
    expect(shouldNotifyUnauthorized('/purchase-orders', 401)).toBe(true);
    expect(shouldNotifyUnauthorized('/auth/login', 401)).toBe(false);
    expect(shouldNotifyUnauthorized('/purchase-orders', 403)).toBe(false);
  });

  it('geeft een loginmelding per reden', () => {
    expect(getLoginReasonMessage(SESSION_END_REASON.IDLE))
      .toBe('You were signed out due to inactivity.');
    expect(getLoginReasonMessage(SESSION_END_REASON.EXPIRED))
      .toBe('Your session expired. Please sign in again.');
    expect(getLoginReasonMessage('other')).toBe('');
  });

  it('roept de handler eenmaal aan tot die klaar is', async () => {
    const handler = vi.fn(() => new Promise((resolve) => {
      setTimeout(resolve, 20);
    }));
    setSessionExpiredHandler(handler);

    notifySessionExpired(SESSION_END_REASON.EXPIRED);
    notifySessionExpired(SESSION_END_REASON.IDLE);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(SESSION_END_REASON.EXPIRED);
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
  });
});
