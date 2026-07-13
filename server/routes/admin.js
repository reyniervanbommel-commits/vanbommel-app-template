'use strict';

const express = require('express');
const sql = require('mssql');
const router = express.Router();
const authService = require('../services/AuthService');
const emailService = require('../services/EmailService');
const { auditLog } = require('../middleware/auditLog');
const { requireRole } = require('../middleware/auth');
const { parsePaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { ROLES, isAllowedRole } = require('../constants/roles');
const settingsService = require('../services/SettingsService');
const passwordResetEmailTemplateService = require('../services/PasswordResetEmailTemplateService');
const { getSqlPool } = require('../utils/sqlPool');

function getPool() {
  return getSqlPool();
}

router.get('/users', async (req, res, next) => {
  try {
    const { page, pageSize } = parsePaginationParams(req.query);
    const offset = (page - 1) * pageSize;
    const pool = await getPool();

    const countResult = await pool.request().query('SELECT COUNT(*) as total FROM dbo.users');
    const total = countResult.recordset[0].total;

    const result = await pool.request()
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, pageSize)
      .query('SELECT id, email, display_name, role, must_set_password, is_locked, mfa_enabled, mfa_required, last_login, created_at FROM dbo.users ORDER BY created_at DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY');

    res.json({ users: result.recordset, meta: buildPaginationMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const { email, role, display_name } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mailadres is vereist' });
    const normalizedRole = authService.normalizeRole(role || ROLES.SUPPLIER);
    if (!isAllowedRole(normalizedRole)) {
      return res.status(400).json({ error: 'Ongeldige rol opgegeven' });
    }
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, authService.normalizeEmail(email))
      .input('role', sql.NVarChar, normalizedRole)
      .input('displayName', sql.NVarChar, display_name || null)
      .query('INSERT INTO dbo.users (email, role, display_name) OUTPUT INSERTED.* VALUES (@email, @role, @displayName)');
    const newUser = result.recordset[0];
    const setPasswordUrl = (process.env.APP_BASE_URL || 'http://localhost:5173') + '/set-password?email=' + encodeURIComponent(newUser.email);
    await emailService.sendInviteEmail(newUser.email, setPasswordUrl).catch(() => {});
    await auditLog(req.user.id, req.user.email, 'CREATE_USER', 'users', newUser.id, { email: newUser.email, role: newUser.role });
    res.status(201).json({ user: newUser });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, is_locked, mfa_required } = req.body;
    const pool = await getPool();
    const setClauses = [];
    const request = pool.request().input('id', sql.Int, parseInt(id));

    if (role !== undefined) {
      const normalizedRole = authService.normalizeRole(role);
      if (!isAllowedRole(normalizedRole)) {
        return res.status(400).json({ error: 'Ongeldige rol opgegeven' });
      }
      setClauses.push('role = @role');
      request.input('role', sql.NVarChar, normalizedRole);
    }
    if (is_locked !== undefined) { setClauses.push('is_locked = @locked'); request.input('locked', sql.Bit, is_locked ? 1 : 0); }
    if (mfa_required !== undefined) { setClauses.push('mfa_required = @mfaRequired'); request.input('mfaRequired', sql.Bit, mfa_required ? 1 : 0); }

    if (!setClauses.length) return res.status(400).json({ error: 'Geen velden opgegeven' });
    setClauses.push('updated_at = SYSUTCDATETIME()');

    const result = await request.query('UPDATE dbo.users SET ' + setClauses.join(', ') + ' OUTPUT INSERTED.id, INSERTED.email, INSERTED.role, INSERTED.is_locked, INSERTED.mfa_required WHERE id = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Gebruiker niet gevonden' });

    await auditLog(req.user.id, req.user.email, 'UPDATE_USER', 'users', id, req.body);
    res.json({ user: result.recordset[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/force-reset', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const userResult = await pool.request().input('id', sql.Int, parseInt(id)).query('SELECT * FROM dbo.users WHERE id = @id');
    const user = userResult.recordset[0];
    if (!user) return res.status(404).json({ error: 'Gebruiker niet gevonden' });

    const resetResult = await authService.requestPasswordReset(user.email);
    if (resetResult.success) {
      const resetUrl = (process.env.APP_BASE_URL || 'http://localhost:5173') + '/reset-password?token=' + resetResult.token;
      await emailService.sendPasswordResetEmail(user.email, resetUrl).catch(() => {});
    }
    await auditLog(req.user.id, req.user.email, 'FORCE_RESET', 'users', id, {});
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Je kunt je eigen account niet verwijderen' });
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM dbo.users OUTPUT DELETED.email WHERE id = @id');
    if (!result.recordset.length) return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    await auditLog(req.user.id, req.user.email, 'DELETE_USER', 'users', id, { email: result.recordset[0].email });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── Permissions ────────────────────────────────────────────────────────────

router.get('/users/:id/permissions', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, parseInt(req.params.id))
      .query('SELECT page_name FROM dbo.user_permissions WHERE user_id = @userId');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

router.patch('/users/:id/permissions', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { permissions = [] } = req.body;
    const pool = await getPool();

    await pool.request()
      .input('userId', sql.Int, userId)
      .query('DELETE FROM dbo.user_permissions WHERE user_id = @userId');

    for (const { page_name } of permissions) {
      if (page_name) {
        await pool.request()
          .input('userId', sql.Int, userId)
          .input('pageName', sql.NVarChar, page_name)
          .query('INSERT INTO dbo.user_permissions (user_id, page_name) VALUES (@userId, @pageName)');
      }
    }

    await auditLog(req.user.id, req.user.email, 'UPDATE_PERMISSIONS', 'user_permissions', userId, { permissions });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── Analytics ──────────────────────────────────────────────────────────────

router.post('/analytics/log-route', async (req, res, next) => {
  try {
    const { page_name, session_id } = req.body;
    if (!page_name || !req.user?.id) return res.json({ success: true });
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('sessionId', sql.NVarChar, session_id || 'unknown')
      .input('pageName', sql.NVarChar, page_name)
      .query(`INSERT INTO dbo.user_activity (user_id, session_id, activity_type, page_name)
              VALUES (@userId, @sessionId, 'route_change', @pageName)`);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/analytics/page-usage', async (req, res, next) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const pool = await getPool();
    const request = pool.request();
    let where = "activity_type = 'route_change'";
    if (startDate) { where += ' AND created_at >= @startDate'; request.input('startDate', sql.DateTime2, new Date(startDate)); }
    if (endDate) { where += ' AND created_at <= @endDate'; request.input('endDate', sql.DateTime2, new Date(endDate + 'T23:59:59')); }
    if (userId) { where += ' AND user_id = @userId'; request.input('userId', sql.Int, parseInt(userId)); }
    const result = await request.query(`
      SELECT page_name, COUNT(*) as count, COUNT(DISTINCT user_id) as unique_users
      FROM dbo.user_activity WHERE ${where}
      GROUP BY page_name ORDER BY count DESC`);
    res.json({ stats: result.recordset });
  } catch (err) { next(err); }
});

router.get('/analytics/sessions', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getPool();
    const request = pool.request();
    let where = "activity_type = 'login'";
    if (startDate) { where += ' AND created_at >= @startDate'; request.input('startDate', sql.DateTime2, new Date(startDate)); }
    if (endDate) { where += ' AND created_at <= @endDate'; request.input('endDate', sql.DateTime2, new Date(endDate + 'T23:59:59')); }
    const result = await request.query(`
      SELECT COUNT(*) as total_sessions,
             AVG(CAST(session_duration_seconds AS FLOAT)) as avg_duration_seconds,
             MIN(session_duration_seconds) as min_duration_seconds,
             MAX(session_duration_seconds) as max_duration_seconds
      FROM dbo.user_activity WHERE ${where}`);
    res.json(result.recordset[0] || {});
  } catch (err) { next(err); }
});

router.get('/analytics/login-stats', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getPool();
    const request = pool.request();
    let where = "action = 'LOGIN'";
    if (startDate) { where += ' AND created_at >= @startDate'; request.input('startDate', sql.DateTime2, new Date(startDate)); }
    if (endDate) { where += ' AND created_at <= @endDate'; request.input('endDate', sql.DateTime2, new Date(endDate + 'T23:59:59')); }
    const result = await request.query(`
      SELECT CAST(created_at AS DATE) as date, COUNT(*) as count
      FROM dbo.audit_log WHERE ${where}
      GROUP BY CAST(created_at AS DATE) ORDER BY date`);
    res.json({ by_day: result.recordset });
  } catch (err) { next(err); }
});

router.get('/analytics/user-login-stats', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getPool();
    const request = pool.request();
    let where = "action = 'LOGIN'";
    if (startDate) { where += ' AND created_at >= @startDate'; request.input('startDate', sql.DateTime2, new Date(startDate)); }
    if (endDate) { where += ' AND created_at <= @endDate'; request.input('endDate', sql.DateTime2, new Date(endDate + 'T23:59:59')); }
    const result = await request.query(`
      SELECT user_email, COUNT(*) as login_count
      FROM dbo.audit_log WHERE ${where}
      GROUP BY user_email ORDER BY login_count DESC`);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

router.get('/analytics/click-stats', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getPool();
    const request = pool.request();
    let where = "activity_type = 'click'";
    if (startDate) { where += ' AND created_at >= @startDate'; request.input('startDate', sql.DateTime2, new Date(startDate)); }
    if (endDate) { where += ' AND created_at <= @endDate'; request.input('endDate', sql.DateTime2, new Date(endDate + 'T23:59:59')); }
    const result = await request.query(`
      SELECT page_name, element_type, COUNT(*) as count, COUNT(DISTINCT user_id) as unique_users
      FROM dbo.user_activity WHERE ${where}
      GROUP BY page_name, element_type ORDER BY count DESC`);
    res.json({ stats: result.recordset });
  } catch (err) { next(err); }
});

// ─── OData settings ──────────────────────────────────────────────────────────

router.get('/settings/odata', async (req, res, next) => {
  try {
    const config = await settingsService.getODataConfig();

    // Geheimen nooit als waarde teruggeven; alleen of ze ingesteld zijn.
    const secretKeys = settingsService.ODATA_SECRET_KEYS || ['D365_ODATA_CLIENT_SECRET', 'D365_ODATA_BEARER_TOKEN'];
    for (const key of secretKeys) {
      config[key + '_SET'] = !!config[key];
      config[key] = '';
    }

    // Afgeleide, leesbare status zodat de admin ziet wat er gebeurt.
    const baseUrl = (config.D365_ODATA_BASE_URL || '').replace(/\/$/, '');
    const usingClientCredentials = !!(config.D365_ODATA_TENANT_ID && config.D365_ODATA_CLIENT_ID && config.D365_ODATA_CLIENT_SECRET_SET);
    const derived = {
      authMethod: usingClientCredentials ? 'oauth_client_credentials' : (config.D365_ODATA_BEARER_TOKEN_SET ? 'static_bearer_token' : 'none'),
      scope: baseUrl ? baseUrl + '/.default' : '',
      tokenEndpoint: config.D365_ODATA_TENANT_ID
        ? 'https://login.microsoftonline.com/' + config.D365_ODATA_TENANT_ID + '/oauth2/v2.0/token'
        : '',
      entityUrl: baseUrl ? baseUrl + (config.D365_ODATA_PURCHASE_ORDERS_PATH || '') : '',
    };

    res.json({ settings: config, derived, source: 'app_settings' });
  } catch (err) {
    next(err);
  }
});

router.post('/settings/odata', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    const allowed = [...settingsService.ODATA_KEYS];
    const incoming = req.body || {};

    // Leeg secret/token = niet overschrijven (behoud bestaande waarde).
    const secretKeys = settingsService.ODATA_SECRET_KEYS || ['D365_ODATA_CLIENT_SECRET', 'D365_ODATA_BEARER_TOKEN'];
    for (const key of secretKeys) {
      if (incoming[key] === '') delete incoming[key];
    }

    const filtered = Object.fromEntries(
      Object.entries(incoming).filter(([k]) => allowed.includes(k))
    );

    await settingsService.saveODataConfig(filtered, req.user?.id ?? null);
    await auditLog(req.user.id, req.user.email, 'UPDATE_ODATA_SETTINGS', 'app_settings', null, { keys: Object.keys(filtered) });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── Password reset email template (admin only) ─────────────────────────────

router.get('/settings/password-reset-email-template', async (req, res, next) => {
  try {
    const template = await passwordResetEmailTemplateService.getPasswordResetTemplate();
    res.json({ template });
  } catch (err) {
    next(err);
  }
});

router.patch('/settings/password-reset-email-template', async (req, res, next) => {
  try {
    const template = await passwordResetEmailTemplateService.updatePasswordResetTemplate(req.body || {}, req.user?.id ?? null);
    await auditLog(
      req.user.id,
      req.user.email,
      'UPDATE_PASSWORD_RESET_EMAIL_TEMPLATE',
      'app_settings',
      null,
      { key: 'auth.passwordResetEmailTemplate' }
    );
    res.json({ success: true, template });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
