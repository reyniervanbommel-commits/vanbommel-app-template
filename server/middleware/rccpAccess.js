'use strict';

const { ROLES } = require('../constants/roles');
const { getSupplierAccount, isStaffUser } = require('../utils/supplierScope');

/**
 * RCCP access middleware (#AB:224).
 * Staff: full access. Supplier: GET-only with forced own vendorAccount.
 */
function rccpAccess(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.rccpScope = {
    isStaff: isStaffUser(user),
    vendorAccount: null,
    readOnly: false,
  };

  if (user.role === ROLES.SUPPLIER) {
    req.rccpScope.vendorAccount = getSupplierAccount(user);
    req.rccpScope.readOnly = true;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(403).json({ error: 'Suppliers have read-only RCCP access' });
    }
    return next();
  }

  if (isStaffUser(user)) {
    return next();
  }

  return res.status(403).json({ error: 'Insufficient permissions' });
}

function resolveVendorQuery(req) {
  if (req.rccpScope?.vendorAccount) {
    return req.rccpScope.vendorAccount;
  }
  const requested = String(req.query.vendorAccount || req.query.vendor || '').trim();
  return requested || null;
}

function resolveSupplierAccount(req) {
  if (req.rccpScope?.vendorAccount) {
    return req.rccpScope.vendorAccount;
  }
  return null;
}

module.exports = { rccpAccess, resolveVendorQuery, resolveSupplierAccount };
