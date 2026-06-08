'use strict';

const ROLES = Object.freeze({
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
  SUPPLIER: 'supplier',
});

const ALLOWED_ROLES = Object.freeze(Object.values(ROLES));

function isAllowedRole(role) {
  return ALLOWED_ROLES.includes(role);
}

module.exports = { ROLES, ALLOWED_ROLES, isAllowedRole };
