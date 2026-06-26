'use strict';

const express = require('express');
const sql = require('mssql');
const router = express.Router();
const authService = require('../services/AuthService');
const emailService = require('../services/EmailService');
const { auditLog } = require('../middleware/auditLog');
const { parsePaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { ROLES, isAllowedRole } = require('../constants/roles');
const settingsService = require('../services/SettingsService');

function getPool() {
  return sql.connect(process.env.SQL_CONNECTION_STRING);
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
      .query('SELECT id, email, display_name, role, must_set_password, is_locked, mfa_enabled, last_login, created_at FROM dbo.users ORDER BY created_at DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY');

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

// ─── Pagina-permissies ───────────────────────────────────────────────────────

router.get('/users/:id/permissions', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, parseInt(req.params.id))
      .query('SELECT page_name FROM dbo.user_page_permissions WHERE user_id = @userId ORDER BY page_name');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

router.patch('/users/:id/permissions', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const permissions = req.body.permissions || [];
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await transaction.request()
        .input('userId', sql.Int, userId)
        .query('DELETE FROM dbo.user_page_permissions WHERE user_id = @userId');
      for (const perm of permissions) {
        if (perm.page_name) {
          await transaction.request()
            .input('userId', sql.Int, userId)
            .input('pageName', sql.NVarChar, perm.page_name)
            .query('INSERT INTO dbo.user_page_permissions (user_id, page_name) VALUES (@userId, @pageName)');
        }
      }
      await transaction.commit();
      await auditLog(req.user.id, req.user.email, 'UPDATE_PERMISSIONS', 'user_page_permissions', userId, { count: permissions.length });
      res.json({ success: true });
    } catch (err) { await transaction.rollback(); throw err; }
  } catch (err) { next(err); }
});

// ─── Pagina-weergaven bijhouden ──────────────────────────────────────────────

router.post('/analytics/track-page', async (req, res, next) => {
  try {
    const { page_name } = req.body;
    if (!page_name) return res.status(400).json({ error: 'page_name vereist' });
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('userEmail', sql.NVarChar, req.user.email)
      .input('pageName', sql.NVarChar, page_name)
      .query('INSERT INTO dbo.user_page_views (user_id, user_email, page_name) VALUES (@userId, @userEmail, @pageName)');
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/settings/odata', async (req, res, next) => {
  try {
    const config = await settingsService.getODataConfig();
    // Maskeer de bearer token
    if (config.D365_ODATA_BEARER_TOKEN) {
      config.D365_ODATA_BEARER_TOKEN_SET = true;
      config.D365_ODATA_BEARER_TOKEN = '';
    } else {
      config.D365_ODATA_BEARER_TOKEN_SET = false;
    }
    res.json({ settings: config });
  } catch (err) {
    next(err);
  }
});

router.post('/settings/odata', async (req, res, next) => {
  try {
    const allowed = [...settingsService.ODATA_KEYS];
    const incoming = req.body || {};

    // Leeg token = niet overschrijven
    if (incoming.D365_ODATA_BEARER_TOKEN === '') {
      delete incoming.D365_ODATA_BEARER_TOKEN;
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

module.exports = router;
