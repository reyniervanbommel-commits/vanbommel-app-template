'use strict';

const { EmailClient } = require('@azure/communication-email');
const passwordResetEmailTemplateService = require('./PasswordResetEmailTemplateService');

function getClient() {
  const connectionString = process.env.ACS_CONNECTION_STRING;
  if (!connectionString) return null;
  return new EmailClient(connectionString);
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const client = getClient();
  const senderAddress = process.env.ACS_FROM_EMAIL;
  if (!client || !senderAddress) {
    console.warn('[EmailService] ACS niet geconfigureerd; reset-mail overgeslagen');
    return { skipped: true };
  }
  const content = await passwordResetEmailTemplateService.renderPasswordResetEmail(resetUrl);
  const poller = await client.beginSend({
    senderAddress,
    content,
    recipients: { to: [{ address: toEmail }] },
  });
  return poller.pollUntilDone();
}

function buildNightDigestContent(run) {
  const status = String(run?.status || 'unknown');
  const errorText = String(run?.error_text || 'No details').slice(0, 500);
  const entityLines = (run?.entities || [])
    .filter((entity) => entity.status === 'error')
    .map((entity) => `- ${entity.tableKey || entity.label}: ${String(entity.error_text || 'Refresh failed').slice(0, 500)}`);
  const subject = status === 'interrupted'
    ? 'D365 night refresh interrupted'
    : 'D365 night refresh failed';
  const plainText = [
    `Status: ${status}`,
    `Started: ${run?.started_at || 'unknown'}`,
    `Finished: ${run?.finished_at || 'unknown'}`,
    `Summary: ${errorText}`,
    entityLines.length ? `Entity errors:\n${entityLines.join('\n')}` : '',
  ].filter(Boolean).join('\n');
  return {
    subject,
    html: `<p>${plainText.replace(/\n/g, '<br/>')}</p>`,
    plainText,
  };
}

async function sendNightRefreshDigest({ recipients, run }) {
  const client = getClient();
  const senderAddress = process.env.ACS_FROM_EMAIL;
  const to = (Array.isArray(recipients) ? recipients : []).filter(Boolean);
  if (!client || !senderAddress || !to.length) {
    console.warn('[EmailService] ACS not configured or no recipients; night digest skipped');
    return { skipped: true };
  }
  const content = buildNightDigestContent(run);
  const poller = await client.beginSend({
    senderAddress,
    content,
    recipients: { to: to.map((address) => ({ address })) },
  });
  await poller.pollUntilDone();
  return { skipped: false };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function redactNightToken(value) {
  let text = String(value || '');
  const token = String(process.env.NIGHT_REFRESH_TOKEN || '');
  if (token) text = text.split(token).join('[redacted]');
  return text.replace(/Bearer/gi, '').replace(/\s+/g, ' ').trim();
}

function buildNightWekkerFailedContent({ httpStatus, message } = {}) {
  const statusLabel = httpStatus == null ? 'unknown' : String(httpStatus);
  const safeMessage = redactNightToken(String(message || 'No details').slice(0, 200));
  const subject = 'D365 night refresh did not start';
  const plainText = [
    'The Azure night-refresh alarm could not start the D365 refresh.',
    `HTTP status: ${statusLabel}`,
    `Detail: ${safeMessage}`,
  ].join('\n');
  return {
    subject,
    html: `<p>${escapeHtml(plainText).replace(/\n/g, '<br/>')}</p>`,
    plainText,
  };
}

async function sendNightRefreshWekkerFailed({ recipients, httpStatus, message } = {}) {
  const client = getClient();
  const senderAddress = process.env.ACS_FROM_EMAIL;
  const to = (Array.isArray(recipients) ? recipients : []).filter(Boolean);
  if (!client || !senderAddress || !to.length) {
    console.warn('[EmailService] ACS not configured or no recipients; wekker-failed mail skipped');
    return { skipped: true };
  }
  const content = buildNightWekkerFailedContent({ httpStatus, message });
  const poller = await client.beginSend({
    senderAddress,
    content,
    recipients: { to: to.map((address) => ({ address })) },
  });
  await poller.pollUntilDone();
  return { skipped: false };
}

async function sendInviteEmail(toEmail, setPasswordUrl) {
  const client = getClient();
  const senderAddress = process.env.ACS_FROM_EMAIL;
  if (!client || !senderAddress) {
    console.warn('[EmailService] ACS niet geconfigureerd; invite-mail overgeslagen');
    return { skipped: true };
  }
  const poller = await client.beginSend({
    senderAddress,
    content: {
      subject: 'Uitnodiging — stel je wachtwoord in',
      html: '<p>Je bent uitgenodigd. Stel je wachtwoord in via:</p><p><a href="' + setPasswordUrl + '">' + setPasswordUrl + '</a></p>',
      plainText: 'Je bent uitgenodigd. Stel je wachtwoord in via: ' + setPasswordUrl,
    },
    recipients: { to: [{ address: toEmail }] },
  });
  return poller.pollUntilDone();
}

module.exports = {
  sendPasswordResetEmail,
  sendInviteEmail,
  sendNightRefreshDigest,
  buildNightDigestContent,
  sendNightRefreshWekkerFailed,
  buildNightWekkerFailedContent,
};
