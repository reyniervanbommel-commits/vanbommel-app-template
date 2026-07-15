'use strict';

// Gedeelde supplier-scoping. Convention in deze app: het leveranciersaccount is het
// expliciete veld op de user, of anders het local-part van het e-mailadres. Zowel de
// legacy /api/supplier-route als de generieke /api/data-read gebruiken deze bron.
const { ROLES } = require('../constants/roles');

function getSupplierAccount(user) {
  const explicitAccount = (user && (user.supplierAccount || user.vendorAccount || user.vendor_account)) || '';
  if (explicitAccount) return String(explicitAccount).trim();

  const userEmail = (user && user.email) || '';
  const emailPrefix = userEmail.split('@')[0];
  return String(emailPrefix || '').trim();
}

function isStaffUser(user) {
  return user?.role === ROLES.ADMIN || user?.role === ROLES.EMPLOYEE;
}

module.exports = { getSupplierAccount, isStaffUser };
