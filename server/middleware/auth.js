'use strict';

const { ROLES } = require('../constants/roles');

function requireSession(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = req.session.user;
    return next();
  }
  return res.status(401).json({ error: 'Niet geauthenticeerd' });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Niet geauthenticeerd' });
    if (req.user.role !== role && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ error: 'Geen toegang — ' + role + ' rol vereist' });
    }
    return next();
  };
}

function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Niet geauthenticeerd' });
    if (req.user.role === ROLES.ADMIN || roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Geen toegang — ongeldige rol' });
  };
}

module.exports = { requireSession, requireRole, requireAnyRole };
