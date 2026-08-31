'use strict';

const { logger } = require('../utils/logger');
const settingsService = require('./SettingsService');
const emailService = require('./EmailService');
const { parseAlertEmails } = require('../utils/alertEmails');

const ALERT_EMAILS_KEY = 'NIGHT_REFRESH_ALERT_EMAILS';
const MAX_MESSAGE = 200;

function sanitizeWekkerFailedBody(body = {}) {
  const rawStatus = Number(body.httpStatus);
  const httpStatus = Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599
    ? rawStatus
    : null;
  let message = String(body.message || '').trim();
  const token = String(process.env.NIGHT_REFRESH_TOKEN || '');
  if (token) message = message.split(token).join('[redacted]');
  message = message.replace(/Bearer/gi, '').replace(/NIGHT_REFRESH/gi, '').replace(/\s+/g, ' ').trim();
  if (message.length > MAX_MESSAGE) message = message.slice(0, MAX_MESSAGE);
  return { httpStatus, message };
}

async function notifyWekkerStartFailed(body) {
  const { httpStatus, message } = sanitizeWekkerFailedBody(body);
  try {
    const raw = await settingsService.getAsync(ALERT_EMAILS_KEY, '');
    const recipients = parseAlertEmails(raw);
    if (!recipients.length) return { sent: false };
    const result = await emailService.sendNightRefreshWekkerFailed({ recipients, httpStatus, message });
    return { sent: !result?.skipped };
  } catch (err) {
    logger.warn('Wekker-failed mail mislukt', { error: err.message });
    return { sent: false };
  }
}

async function handleStartFailed(req, res) {
  const result = await notifyWekkerStartFailed(req.body || {});
  return res.status(202).json({ sent: result.sent });
}

module.exports = { sanitizeWekkerFailedBody, notifyWekkerStartFailed, handleStartFailed };
