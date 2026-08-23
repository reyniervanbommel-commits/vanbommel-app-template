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
