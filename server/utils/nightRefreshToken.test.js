'use strict';

const {
  getNightRefreshConfigError,
  requireNightRefreshToken,
  timingSafeEqualString,
} = require('./nightRefreshToken');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('nightRefreshToken', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env.APP_ENV = originalEnv.APP_ENV;
    process.env.NIGHT_REFRESH_TOKEN = originalEnv.NIGHT_REFRESH_TOKEN;
  });

  it('is fail-closed buiten production', () => {
    process.env.APP_ENV = 'preview';
    process.env.NIGHT_REFRESH_TOKEN = 'x'.repeat(32);
    expect(getNightRefreshConfigError()).toEqual({
      status: 503,
      error: 'Night refresh is only available in production',
    });
  });

  it('is fail-closed wanneer het token ontbreekt of te kort is', () => {
    process.env.APP_ENV = 'production';
    process.env.NIGHT_REFRESH_TOKEN = 'short';
    expect(getNightRefreshConfigError()?.status).toBe(503);
    delete process.env.NIGHT_REFRESH_TOKEN;
    expect(getNightRefreshConfigError()?.status).toBe(503);
  });

  it('vergelijkt tokens timing-safe en weigert een verkeerde Bearer', () => {
    process.env.APP_ENV = 'production';
    process.env.NIGHT_REFRESH_TOKEN = 'n'.repeat(32);
    expect(timingSafeEqualString('n'.repeat(32), 'n'.repeat(32))).toBe(true);
    const req = { get: () => 'Bearer wrong-token-value-is-long-enough' };
    const res = mockRes();
    const next = vi.fn();
    requireNightRefreshToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('laat een geldige Bearer in production door', () => {
    process.env.APP_ENV = 'production';
    process.env.NIGHT_REFRESH_TOKEN = 'n'.repeat(32);
    const req = { get: () => `Bearer ${'n'.repeat(32)}` };
    const res = mockRes();
    const next = vi.fn();
    requireNightRefreshToken(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
