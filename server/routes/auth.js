'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authService = require('../services/AuthService');
const emailService = require('../services/EmailService');
const { requireSession } = require('../middleware/auth');

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Te veel pogingen. Probeer het over een minuut opnieuw.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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
    res.json({ user: result.user });
  } catch (err) {
    if (err.message.includes('onjuist') || err.message.includes('geblokkeerd')) {
      return res.status(401).json({ error: err.message });
    }
    next(err);
  }
});

router.post('/logout', (req, res) => {
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
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', strictLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    if (result.success) {
      const resetUrl = (process.env.APP_BASE_URL || 'http://localhost:5173') + '/reset-password?token=' + result.token;
      await emailService.sendPasswordResetEmail(result.user.email, resetUrl).catch(() => {});
    }
    res.json({ success: true, message: 'Als het e-mailadres bekend is, ontvang je een resetlink.' });
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
