'use strict';

const { ROLES } = require('../constants/roles');

function requireSession(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = req.session.user;
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role !== role && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ error: 'Access denied — ' + role + ' role required' });
    }
    return next();
  };
}

function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role === ROLES.ADMIN) return next();
    if (!Array.isArray(roles) || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied — insufficient permissions' });
    }
    return next();
  };
}

module.exports = { requireSession, requireRole, requireAnyRole };
