'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const sql = require('mssql');
const router = express.Router();
const authService = require('../services/AuthService');
const emailService = require('../services/EmailService');
const { requireSession } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Te veel pogingen. Probeer het over een minuut opnieuw.' },
  standardHeaders: true,
  legacyHeaders: false,
});

async function recordLoginAnalytics(userId, sessionId) {
  if (!userId || !sessionId) return;
  try {
    const pool = await sql.connect(process.env.SQL_CONNECTION_STRING);
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('sessionId', sql.NVarChar, sessionId)
      .query(`INSERT INTO dbo.user_activity (user_id, session_id, activity_type, page_name)
              VALUES (@userId, @sessionId, 'login', 'auth/login')`);
  } catch (err) {
    console.error('[auth.analytics] LOGIN activity logging mislukt:', err.message);
  }
}

async function recordLogoutAnalytics(userId, sessionId, loggedInAt) {
  if (!userId) return;
  try {
    const loginDate = loggedInAt ? new Date(loggedInAt) : null;
    const durationSeconds = loginDate && !Number.isNaN(loginDate.getTime())
      ? Math.max(0, Math.round((Date.now() - loginDate.getTime()) / 1000))
      : null;
    const safeSessionId = sessionId || 'unknown';

    const pool = await sql.connect(process.env.SQL_CONNECTION_STRING);
    const latestLoginQuery = sessionId
      ? `;WITH latest_login AS (
           SELECT TOP (1) id
           FROM dbo.user_activity
           WHERE user_id = @userId
             AND session_id = @sessionId
             AND activity_type = 'login'
           ORDER BY created_at DESC
         )
         UPDATE dbo.user_activity
         SET session_duration_seconds = COALESCE(@durationSeconds, session_duration_seconds)
         WHERE id IN (SELECT id FROM latest_login)`
      : `;WITH latest_login AS (
           SELECT TOP (1) id
           FROM dbo.user_activity
           WHERE user_id = @userId
             AND activity_type = 'login'
           ORDER BY created_at DESC
         )
         UPDATE dbo.user_activity
         SET session_duration_seconds = COALESCE(@durationSeconds, session_duration_seconds)
         WHERE id IN (SELECT id FROM latest_login)`;

    const updateRequest = pool.request()
      .input('userId', sql.Int, userId)
      .input('durationSeconds', sql.Int, durationSeconds);
    if (sessionId) {
      updateRequest.input('sessionId', sql.NVarChar, sessionId);
    }
    await updateRequest.query(latestLoginQuery);

    await pool.request()
      .input('userId', sql.Int, userId)
      .input('sessionId', sql.NVarChar, safeSessionId)
      .input('durationSeconds', sql.Int, durationSeconds)
      .query(`INSERT INTO dbo.user_activity (user_id, session_id, activity_type, page_name, session_duration_seconds)
              VALUES (@userId, @sessionId, 'logout', 'auth/logout', @durationSeconds)`);
  } catch (err) {
    console.error('[auth.analytics] LOGOUT activity logging mislukt:', err.message);
  }
}

router.post('/login', strictLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mailadres is vereist' });
    const result = await authService.login(email, password);
    if (result.requiresPasswordSetup) {
      return res.json({ requiresPasswordSetup: true, email: result.user.email });
    }
    req.session.userId = result.user.id;
    req.session.user = result.user;
    req.session.loggedInAt = new Date().toISOString();
    await auditLog(result.user.id, result.user.email, 'LOGIN', 'users', result.user.id, { source: 'password' });
    await recordLoginAnalytics(result.user.id, req.sessionID);
    res.json({ user: result.user });
  } catch (err) {
    if (err.message.includes('onjuist') || err.message.includes('geblokkeerd')) {
      return res.status(401).json({ error: err.message });
    }
    next(err);
  }
});

router.post('/logout', async (req, res) => {
  const sessionUserId = req.session?.userId || req.session?.user?.id || null;
  const sessionUserEmail = req.session?.user?.email || null;
  const sessionId = req.sessionID;
  const loggedInAt = req.session?.loggedInAt || null;

  if (sessionUserId) {
    await recordLogoutAnalytics(sessionUserId, sessionId, loggedInAt);
    await auditLog(sessionUserId, sessionUserEmail, 'LOGOUT', 'users', sessionUserId, {});
  }

  req.session.destroy(() => res.json({ success: true }));
});

router.post('/set-password', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'E-mailadres en wachtwoord zijn vereist' });
    const user = await authService.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    await authService.setPasswordForUser(user.id, password);
    const safeUser = authService.mapUserForSession(user);
    req.session.userId = user.id;
    req.session.user = safeUser;
    req.session.loggedInAt = new Date().toISOString();
    await auditLog(user.id, user.email, 'LOGIN', 'users', user.id, { source: 'set-password' });
    await recordLoginAnalytics(user.id, req.sessionID);
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', strictLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);

    const response = { success: true, message: 'Als het e-mailadres bekend is, ontvang je een resetlink.' };
    const isProduction = process.env.NODE_ENV === 'production';

    if (result.success) {
      const resetUrl = (process.env.APP_BASE_URL || 'http://localhost:5173') + '/reset-password?token=' + result.token;
      const emailResult = await emailService.sendPasswordResetEmail(result.user.email, resetUrl).catch(() => ({ skipped: true }));

      // DEV-fallback: zonder werkende mail (bv. ACS niet ingericht) geven we de resetlink
      // direct terug in de response zodat lokaal/DEV testen mogelijk is. Nooit in productie.
      const mailSkipped = emailResult && emailResult.skipped;
      if (!isProduction && mailSkipped) {
        response.devResetUrl = resetUrl;
        response.devNotice = 'DEV: mail niet verstuurd, gebruik deze resetlink direct.';
      }
    } else if (!isProduction) {
      // Alleen in DEV: maak expliciet waarom er geen link is (account bestaat nog niet).
      response.devNotice = 'DEV: geen account gevonden voor dit e-mailadres. Draai migraties (npm run migrate:db) of maak het account aan.';
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token en wachtwoord zijn vereist' });
    const user = await authService.resetPassword(token, password);
    res.json({ success: true, user });
  } catch (err) {
    if (err.message.includes('ongeldig')) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.get('/me', requireSession, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
