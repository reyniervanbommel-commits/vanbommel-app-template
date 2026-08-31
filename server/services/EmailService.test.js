'use strict';

const { buildNightDigestContent } = require('./EmailService');

describe('EmailService night digest', () => {
  it('bouwt een Engelse samenvatting zonder stack of token', () => {
    const content = buildNightDigestContent({
      status: 'error',
      started_at: '2026-08-22T00:00:00.000Z',
      finished_at: '2026-08-22T00:10:00.000Z',
      error_text: 'vendors: timeout',
      entities: [{ tableKey: 'vendors', status: 'error', error_text: 'timeout' }],
    });
    expect(content.subject).toBe('D365 night refresh failed');
    expect(content.plainText).toContain('Status: error');
    expect(content.plainText).toContain('vendors: timeout');
    expect(content.plainText).not.toMatch(/NIGHT_REFRESH_TOKEN|Bearer|stack/i);
  });
});

describe('EmailService wekker failed', () => {
  const originalToken = process.env.NIGHT_REFRESH_TOKEN;

  afterEach(() => {
    process.env.NIGHT_REFRESH_TOKEN = originalToken;
  });

  it('bouwt Engelse copy zonder token-waarde of Bearer', () => {
    const token = 'n'.repeat(32);
    process.env.NIGHT_REFRESH_TOKEN = token;
    const { buildNightWekkerFailedContent } = require('./EmailService');
    const content = buildNightWekkerFailedContent({
      httpStatus: 503,
      message: `boom <script> Bearer ${token}`,
    });
    expect(content.subject).toBe('D365 night refresh did not start');
    expect(content.plainText).toContain('503');
    expect(content.plainText).not.toContain(token);
    expect(content.html).not.toContain(token);
    expect(content.plainText).not.toMatch(/Bearer/i);
    expect(content.html).toContain('&lt;script&gt;');
  });
});
