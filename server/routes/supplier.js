'use strict';

const express = require('express');
const { query, validationResult } = require('express-validator');
const { fetchPurchaseOrders } = require('../services/D365ODataService');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const purchaseOrdersValidator = [
  query('top').optional().isInt({ min: 1, max: 100 }).withMessage('top moet tussen 1 en 100 liggen'),
  query('skip').optional().isInt({ min: 0, max: 10000 }).withMessage('skip moet tussen 0 en 10000 liggen'),
];
const SUPPLIER_ACCOUNT_PATTERN = /^[a-zA-Z0-9._+-]{2,40}$/;

function getSupplierAccount(user) {
  const explicitAccount = (user && (user.supplierAccount || user.vendorAccount || user.vendor_account)) || '';
  if (explicitAccount) return String(explicitAccount).trim();

  const userEmail = (user && user.email) || '';
  const emailPrefix = userEmail.split('@')[0];
  return String(emailPrefix || '').trim();
}

function isValidSupplierAccount(value) {
  return SUPPLIER_ACCOUNT_PATTERN.test(String(value || ''));
}

function isStaffUser(user) {
  return user?.role === ROLES.ADMIN || user?.role === ROLES.EMPLOYEE;
}

router.get('/purchase-orders', purchaseOrdersValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Ongeldige query-parameters', details: errors.array() });
    }

    const staffUser = isStaffUser(req.user);
    const supplierAccount = staffUser ? null : getSupplierAccount(req.user);

    if (!staffUser) {
      if (!supplierAccount) {
        return res.status(400).json({ error: 'Supplier account ontbreekt voor huidige gebruiker' });
      }
      if (!isValidSupplierAccount(supplierAccount)) {
        return res.status(400).json({ error: 'Supplier account heeft ongeldig formaat' });
      }
    }

    const top = Number.parseInt(req.query.top || '25', 10);
    const skip = Number.parseInt(req.query.skip || '0', 10);
    const result = await fetchPurchaseOrders({ supplierAccount, top, skip });

    return res.json({
      supplierAccount: supplierAccount || null,
      scope: staffUser ? 'company' : 'supplier',
      meta: { top, skip, total: result.total },
      purchaseOrders: result.items,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
