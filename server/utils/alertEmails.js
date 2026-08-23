'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseAlertEmails(raw) {
  return String(raw || '')
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isValidAlertEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

function validateAlertEmails(list) {
  const emails = (Array.isArray(list) ? list : parseAlertEmails(list))
    .map((email) => String(email).trim())
    .filter(Boolean);
  const invalid = emails.filter((email) => !isValidAlertEmail(email));
  if (invalid.length) {
    const err = new Error('One or more email addresses are invalid');
    err.status = 400;
    throw err;
  }
  return emails;
}

function serializeAlertEmails(list) {
  return validateAlertEmails(list).join(',');
}

module.exports = {
  parseAlertEmails,
  isValidAlertEmail,
  validateAlertEmails,
  serializeAlertEmails,
};
