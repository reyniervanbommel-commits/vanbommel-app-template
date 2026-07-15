'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sql = require('mssql');
const { ROLES, isAllowedRole } = require('../constants/roles');
const { getSqlPool } = require('../utils/sqlPool');

function getPool() {
  return getSqlPool();
}

function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}

function normalizeRole(role) {
  const normalizedRole = (role || '').toLowerCase().trim();
  if (!isAllowedRole(normalizedRole)) return null;
  return normalizedRole;
}

function mapUserForSession(user) {
  if (!user) return null;
  const normalizedRole = normalizeRole(user.role) || ROLES.SUPPLIER;
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name || null,
    role: normalizedRole,
    vendor_account: user.vendor_account || null,
    mfa_enabled: Boolean(user.mfa_enabled),
    must_set_password: Boolean(user.must_set_password),
    is_locked: Boolean(user.is_locked),
    last_login: user.last_login || null,
  };
}

function validatePasswordRules(password) {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  return { valid: true };
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function getUserByEmail(email) {
  const pool = await getPool();
  const result = await pool.request()
    .input('email', sql.NVarChar, normalizeEmail(email))
    .query('SELECT * FROM dbo.users WHERE email = @email');
  return result.recordset[0] || null;
}

async function applyProgressiveDelay(failedAttempts) {
  if (!failedAttempts) return;
  const delay = [1000, 2000, 4000][Math.min(failedAttempts - 1, 2)];
  await new Promise(resolve => setTimeout(resolve, delay));
}

async function login(email, password) {
  const user = await getUserByEmail(email);
  if (!user) throw new Error('Email address or password is incorrect');
  if (user.is_locked) throw new Error('Account locked. Request a new password.');

  if (user.must_set_password || !user.password_hash) {
    const bootstrapEmail = normalizeEmail(process.env.BOOTSTRAP_ADMIN_EMAIL || '');
    const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    if (bootstrapEmail && bootstrapPassword && normalizeEmail(email) === bootstrapEmail && password === bootstrapPassword) {
      const pool = await getPool();
      const hash = await hashPassword(password);
      await pool.request()
        .input('id', sql.Int, user.id)
        .input('hash', sql.NVarChar, hash)
        .query("UPDATE dbo.users SET password_hash = @hash, must_set_password = 0, role = 'admin', updated_at = SYSUTCDATETIME() WHERE id = @id");
      return { user: { ...mapUserForSession(user), role: ROLES.ADMIN, must_set_password: false } };
    }
    return { requiresPasswordSetup: true, user: mapUserForSession(user) };
  }

  const passwordValid = await bcrypt.compare(password || '', user.password_hash);
  if (!passwordValid) {
    await applyProgressiveDelay(user.failed_attempts);
    const pool = await getPool();
    const newAttempts = (user.failed_attempts || 0) + 1;
    const locked = newAttempts >= 3 ? 1 : 0;
    await pool.request()
      .input('id', sql.Int, user.id)
      .input('attempts', sql.Int, newAttempts)
      .input('locked', sql.Bit, locked)
      .query('UPDATE dbo.users SET failed_attempts = @attempts, is_locked = @locked, updated_at = SYSUTCDATETIME() WHERE id = @id');
    if (locked) throw new Error('Account locked after 3 failed attempts. Request a new password.');
    throw new Error('Email address or password is incorrect');
  }

  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, user.id)
    .query('UPDATE dbo.users SET failed_attempts = 0, last_login = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME() WHERE id = @id');

  return { user: mapUserForSession(user) };
}

async function setPasswordForUser(userId, password) {
  const validation = validatePasswordRules(password);
  if (!validation.valid) throw new Error(validation.error);
  const pool = await getPool();
  const hash = await hashPassword(password);
  await pool.request()
    .input('id', sql.Int, userId)
    .input('hash', sql.NVarChar, hash)
    .query('UPDATE dbo.users SET password_hash = @hash, must_set_password = 0, updated_at = SYSUTCDATETIME() WHERE id = @id');
}

async function requestPasswordReset(email) {
  const user = await getUserByEmail(email);
  if (!user) return { success: false, code: 'EMAIL_NOT_FOUND' };

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const pool = await getPool();
  await pool.request()
    .input('userId', sql.Int, user.id)
    .input('tokenHash', sql.NVarChar, tokenHash)
    .query('INSERT INTO dbo.password_reset_tokens (user_id, token_hash, expires_at) VALUES (@userId, @tokenHash, DATEADD(HOUR, 1, SYSUTCDATETIME()))');

  return { success: true, user, token };
}

async function resetPassword(token, password) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const pool = await getPool();
  const result = await pool.request()
    .input('hash', sql.NVarChar, tokenHash)
    .query('SELECT * FROM dbo.password_reset_tokens WHERE token_hash = @hash AND expires_at > SYSUTCDATETIME() AND used_at IS NULL');

  const record = result.recordset[0];
  if (!record) throw new Error('Reset link is invalid or expired');

  await setPasswordForUser(record.user_id, password);

  await pool.request()
    .input('id', sql.Int, record.id)
    .query('UPDATE dbo.password_reset_tokens SET used_at = SYSUTCDATETIME() WHERE id = @id');

  const userResult = await pool.request()
    .input('id', sql.Int, record.user_id)
    .query('SELECT * FROM dbo.users WHERE id = @id');
  return mapUserForSession(userResult.recordset[0]);
}

module.exports = {
  login,
  setPasswordForUser,
  requestPasswordReset,
  resetPassword,
  validatePasswordRules,
  getUserByEmail,
  normalizeEmail,
  normalizeRole,
  mapUserForSession,
};
