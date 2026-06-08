'use strict';

const express = require('express');
const { query, validationResult } = require('express-validator');
const { fetchPurchaseOrders } = require('../services/D365ODataService');

const router = express.Router();

const purchaseOrdersValidator = [
  query('top').optional().isInt({ min: 1, max: 100 }).withMessage('top moet tussen 1 en 100 liggen'),
  query('skip').optional().isInt({ min: 0, max: 10000 }).withMessage('skip moet tussen 0 en 10000 liggen'),
];

function getSupplierAccount(user) {
  const explicitAccount = (user && (user.supplierAccount || user.vendorAccount || user.vendor_account)) || '';
  if (explicitAccount) return String(explicitAccount).trim();

  const userEmail = (user && user.email) || '';
  const emailPrefix = userEmail.split('@')[0];
  return String(emailPrefix || '').trim();
}

router.get('/purchase-orders', purchaseOrdersValidator, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Ongeldige query-parameters', details: errors.array() });
    }

    const supplierAccount = getSupplierAccount(req.user);
    if (!supplierAccount) {
      return res.status(400).json({ error: 'Supplier account ontbreekt voor huidige gebruiker' });
    }

    const top = Number.parseInt(req.query.top || '25', 10);
    const skip = Number.parseInt(req.query.skip || '0', 10);
    const result = await fetchPurchaseOrders({ supplierAccount, top, skip });

    return res.json({
      supplierAccount,
      meta: { top, skip, total: result.total },
      purchaseOrders: result.items,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
