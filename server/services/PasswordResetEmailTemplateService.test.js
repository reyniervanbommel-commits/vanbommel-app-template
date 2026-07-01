'use strict';

const settingsService = require('./SettingsService');
const passwordResetEmailTemplateService = require('./PasswordResetEmailTemplateService');

describe('PasswordResetEmailTemplateService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders default password reset email when no template is stored', async () => {
    vi.spyOn(settingsService, 'getAsync').mockResolvedValue('');

    const result = await passwordResetEmailTemplateService.renderPasswordResetEmail('https://example.test/reset?token=abc');

    expect(result.subject).toBe('Reset your password');
    expect(result.plainText).toContain('https://example.test/reset?token=abc');
    expect(result.plainText).toContain('valid for 1 hour');
    expect(result.html).toContain('<a href="https://example.test/reset?token=abc"');
    expect(result.html).toContain('Reset password</a>');
  });

  it('escapes stored template values and reset URL in HTML output', async () => {
    vi.spyOn(settingsService, 'getAsync').mockResolvedValue(JSON.stringify({
      subject: 'Reset',
      title: '<script>alert(1)</script>',
      introText: 'Click the button',
      buttonText: 'Reset now',
      footerText: 'Safe footer',
      brandName: 'Vendor App',
      backgroundColor: '#ffffff',
      buttonColor: '#000000',
    }));

    const result = await passwordResetEmailTemplateService.renderPasswordResetEmail('https://example.test/reset?token=<bad>');

    expect(result.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(result.html).toContain('https://example.test/reset?token=&lt;bad&gt;');
    expect(result.html).not.toContain('<script>alert(1)</script>');
  });
});
