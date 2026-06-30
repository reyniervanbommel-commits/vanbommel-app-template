'use strict';

const settingsService = require('./SettingsService');

const SETTING_KEY = 'auth.passwordResetEmailTemplate';

const DEFAULT_TEMPLATE = Object.freeze({
  subject: 'Reset your password',
  title: 'Reset your password',
  introText: 'We received a request to reset your password. This link is valid for 1 hour.',
  buttonText: 'Reset password',
  footerText: 'If you did not request this, you can safely ignore this email.',
  brandName: 'Vendor Collaboration App',
  backgroundColor: '#F5F3F0',
  buttonColor: '#0F6CBD',
});

const LIMITS = Object.freeze({
  subject: 120,
  title: 120,
  introText: 600,
  buttonText: 80,
  footerText: 500,
  brandName: 80,
});

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeText(value, fallback, maxLength) {
  const text = String(value || '').trim();
  return (text || fallback).slice(0, maxLength);
}

function normalizeColor(value, fallback) {
  const color = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function normalizeTemplate(input = {}) {
  return {
    subject: normalizeText(input.subject, DEFAULT_TEMPLATE.subject, LIMITS.subject),
    title: normalizeText(input.title, DEFAULT_TEMPLATE.title, LIMITS.title),
    introText: normalizeText(input.introText, DEFAULT_TEMPLATE.introText, LIMITS.introText),
    buttonText: normalizeText(input.buttonText, DEFAULT_TEMPLATE.buttonText, LIMITS.buttonText),
    footerText: normalizeText(input.footerText, DEFAULT_TEMPLATE.footerText, LIMITS.footerText),
    brandName: normalizeText(input.brandName, DEFAULT_TEMPLATE.brandName, LIMITS.brandName),
    backgroundColor: normalizeColor(input.backgroundColor, DEFAULT_TEMPLATE.backgroundColor),
    buttonColor: normalizeColor(input.buttonColor, DEFAULT_TEMPLATE.buttonColor),
  };
}

function parseTemplate(rawSettingValue) {
  if (!rawSettingValue) return { ...DEFAULT_TEMPLATE };
  try {
    return normalizeTemplate(JSON.parse(rawSettingValue));
  } catch {
    return { ...DEFAULT_TEMPLATE };
  }
}

async function getPasswordResetTemplate() {
  const raw = await settingsService.getAsync(SETTING_KEY, '');
  return parseTemplate(raw);
}

async function updatePasswordResetTemplate(input, userId = null) {
  const template = normalizeTemplate(input);
  await settingsService.set(
    SETTING_KEY,
    JSON.stringify(template),
    userId
  );
  return template;
}

async function renderPasswordResetEmail(resetUrl) {
  const template = await getPasswordResetTemplate();
  const safeUrl = escapeHtml(resetUrl);
  const safe = Object.fromEntries(
    Object.entries(template).map(([key, value]) => [key, escapeHtml(value)])
  );
  const preheader = escapeHtml(
    'Use the button in this email to reset your password within 1 hour.'
  );

  return {
    subject: template.subject,
    plainText: `${template.introText}\n\n${template.buttonText} (valid for 1 hour): ${resetUrl}\n\n${template.footerText}`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:${safe.backgroundColor};font-family:Arial,sans-serif;color:#242424;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${safe.backgroundColor};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px;">
            <tr><td style="font-size:14px;color:#666666;padding-bottom:16px;">${safe.brandName}</td></tr>
            <tr><td style="font-size:26px;font-weight:700;padding-bottom:16px;">${safe.title}</td></tr>
            <tr><td style="font-size:16px;line-height:1.5;padding-bottom:24px;">${safe.introText}</td></tr>
            <tr>
              <td style="padding-bottom:24px;">
                <a href="${safeUrl}" style="display:inline-block;background:${safe.buttonColor};color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 20px;font-weight:700;">${safe.buttonText}</a>
              </td>
            </tr>
            <tr><td style="font-size:13px;line-height:1.5;color:#666666;padding-bottom:12px;">${safe.footerText}</td></tr>
            <tr><td style="font-size:12px;line-height:1.5;color:#777777;word-break:break-all;">Button not working? Copy this link into your browser:<br><a href="${safeUrl}" style="color:${safe.buttonColor};">${safeUrl}</a></td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

module.exports = {
  DEFAULT_TEMPLATE,
  getPasswordResetTemplate,
  updatePasswordResetTemplate,
  renderPasswordResetEmail,
};
