'use strict';

const crypto = require('crypto');

const MIN_TOKEN_LENGTH = 32;

function timingSafeEqualString(left, right) {
  const leftBuf = Buffer.from(String(left || ''), 'utf8');
  const rightBuf = Buffer.from(String(right || ''), 'utf8');
  if (leftBuf.length !== rightBuf.length) {
    crypto.timingSafeEqual(leftBuf, leftBuf);
    return false;
  }
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function getNightRefreshConfigError() {
  if (String(process.env.APP_ENV || '').trim() !== 'production') {
    return { status: 503, error: 'Night refresh is only available in production' };
  }
  const token = process.env.NIGHT_REFRESH_TOKEN;
  if (!token || String(token).length < MIN_TOKEN_LENGTH) {
    return { status: 503, error: 'Night refresh is not configured' };
  }
  return null;
}

function readBearerToken(req) {
  const header = String(req.get?.('authorization') || req.headers?.authorization || '');
  const match = header.match(/^Bearer\s+(\S+)/i);
  return match ? match[1] : '';
}

function requireNightRefreshToken(req, res, next) {
  const configError = getNightRefreshConfigError();
  if (configError) {
    return res.status(configError.status).json({ error: configError.error });
  }
  const provided = readBearerToken(req);
  if (!provided || !timingSafeEqualString(provided, process.env.NIGHT_REFRESH_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

module.exports = {
  MIN_TOKEN_LENGTH,
  timingSafeEqualString,
  getNightRefreshConfigError,
  requireNightRefreshToken,
};
