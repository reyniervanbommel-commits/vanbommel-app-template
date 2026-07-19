'use strict';

/**
 * Vervalstatus van de D365 client secret.
 *
 * De app kan de echte vervaldatum niet uit Entra ID ophalen: de app-registratie heeft
 * bewust geen Graph-permissies (zie .cursor/plans/dev_2026-07-19-d365-live-golive.plan.md).
 * De datum komt daarom uit de instelling D365_ODATA_CLIENT_SECRET_EXPIRES_AT — gevoed door
 * Key Vault via de deploy, of handmatig via de admin-UI.
 */

// Waarschuwen vanaf een maand voor de vervaldatum.
const WARNING_THRESHOLD_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Berekent de vervalstatus van de client secret.
 *
 * @param {string} expiresAtRaw - ISO-datum ('2028-07-19' of volledige timestamp). Leeg = onbekend.
 * @param {Date} [now] - Injecteerbaar voor tests.
 * @returns {{expiresAt: string|null, daysRemaining: number|null, status: 'unknown'|'ok'|'warning'|'expired', thresholdDays: number}}
 */
function getSecretExpiryStatus(expiresAtRaw, now = new Date()) {
  const raw = (expiresAtRaw || '').trim();
  if (!raw) {
    return { expiresAt: null, daysRemaining: null, status: 'unknown', thresholdDays: WARNING_THRESHOLD_DAYS };
  }

  const expiresAt = new Date(raw);
  if (Number.isNaN(expiresAt.getTime())) {
    // Onleesbare waarde behandelen we als 'onbekend' en niet als 'verlopen': een typefout
    // in de instelling mag geen vals alarm opleveren.
    return { expiresAt: null, daysRemaining: null, status: 'unknown', thresholdDays: WARNING_THRESHOLD_DAYS };
  }

  // Naar boven afronden: een secret die over 0,3 dag verloopt heeft "1 dag" te gaan, niet 0.
  const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / MS_PER_DAY);

  let status;
  if (daysRemaining <= 0) {
    status = 'expired';
  } else if (daysRemaining <= WARNING_THRESHOLD_DAYS) {
    status = 'warning';
  } else {
    status = 'ok';
  }

  return {
    expiresAt: expiresAt.toISOString(),
    daysRemaining,
    status,
    thresholdDays: WARNING_THRESHOLD_DAYS,
  };
}

module.exports = { getSecretExpiryStatus, WARNING_THRESHOLD_DAYS };
