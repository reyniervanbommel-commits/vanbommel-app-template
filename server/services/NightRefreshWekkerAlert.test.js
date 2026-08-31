'use strict';

process.env.NIGHT_REFRESH_TOKEN = 'n'.repeat(32);

const emailService = require('./EmailService');
const settingsService = require('./SettingsService');

const originalSend = emailService.sendNightRefreshWekkerFailed;
const originalGetAsync = settingsService.getAsync;

emailService.sendNightRefreshWekkerFailed = vi.fn();
settingsService.getAsync = vi.fn();

const {
  sanitizeWekkerFailedBody,
  notifyWekkerStartFailed,
  handleStartFailed,
} = require('./NightRefreshWekkerAlert');

describe('NightRefreshWekkerAlert', () => {
  beforeEach(() => {
    emailService.sendNightRefreshWekkerFailed.mockReset();
    settingsService.getAsync.mockReset();
  });

  afterAll(() => {
    emailService.sendNightRefreshWekkerFailed = originalSend;
    settingsService.getAsync = originalGetAsync;
  });

  it('redacteert token-waarde en Bearer, kapt op 200 tekens', () => {
    const token = 'n'.repeat(32);
    const result = sanitizeWekkerFailedBody({
      httpStatus: 401,
      message: `Bearer ${token} extra NIGHT_REFRESH ${'x'.repeat(300)}`,
    });
    expect(result.httpStatus).toBe(401);
    expect(result.message).not.toContain(token);
    expect(result.message).not.toMatch(/Bearer/i);
    expect(result.message.length).toBeLessThanOrEqual(200);
  });

  it('verwerpt ongeldige httpStatus', () => {
    expect(sanitizeWekkerFailedBody({ httpStatus: 99 }).httpStatus).toBeNull();
    expect(sanitizeWekkerFailedBody({ httpStatus: 'nope' }).httpStatus).toBeNull();
  });

  it('skipped mail zonder recipients', async () => {
    settingsService.getAsync.mockResolvedValue('');
    const result = await notifyWekkerStartFailed({ httpStatus: 503, message: 'down' });
    expect(result.sent).toBe(false);
    expect(emailService.sendNightRefreshWekkerFailed).not.toHaveBeenCalled();
  });

  it('stuurt mail via ACS bij recipients', async () => {
    settingsService.getAsync.mockResolvedValue('ops@example.com');
    emailService.sendNightRefreshWekkerFailed.mockResolvedValue({ skipped: false });
    const result = await notifyWekkerStartFailed({ httpStatus: 503, message: 'down' });
    expect(result.sent).toBe(true);
    expect(emailService.sendNightRefreshWekkerFailed).toHaveBeenCalledTimes(1);
  });

  it('ACS-fout levert sent false zonder throw', async () => {
    settingsService.getAsync.mockResolvedValue('ops@example.com');
    emailService.sendNightRefreshWekkerFailed.mockRejectedValue(new Error('ACS down'));
    const result = await notifyWekkerStartFailed({ httpStatus: 500, message: 'x' });
    expect(result.sent).toBe(false);
  });

  it('handleStartFailed antwoordt 202', async () => {
    settingsService.getAsync.mockResolvedValue('');
    const req = { body: { httpStatus: 503, message: 'nope' } };
    const res = {
      statusCode: 0,
      body: null,
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; },
    };
    await handleStartFailed(req, res);
    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({ sent: false });
  });
});
