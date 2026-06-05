'use strict';

const { EmailClient } = require('@azure/communication-email');

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
  const poller = await client.beginSend({
    senderAddress,
    content: {
      subject: 'Wachtwoord opnieuw instellen',
      html: '<p>Klik op onderstaande link om je wachtwoord opnieuw in te stellen:</p><p><a href="' + resetUrl + '">' + resetUrl + '</a></p><p>Deze link is 1 uur geldig.</p>',
      plainText: 'Ga naar: ' + resetUrl + '\n\nDeze link is 1 uur geldig.',
    },
    recipients: { to: [{ address: toEmail }] },
  });
  return poller.pollUntilDone();
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

module.exports = { sendPasswordResetEmail, sendInviteEmail };
