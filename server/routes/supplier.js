'use strict';

const express = require('express');
const sql = require('mssql');
const { query, validationResult } = require('express-validator');
const { fetchPurchaseOrders } = require('../services/D365ODataService');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const purchaseOrdersValidator = [
  query('all').optional().isBoolean().withMessage('all moet true of false zijn').toBoolean(),
  query('top').optional().isInt({ min: 1, max: 500 }).withMessage('top moet tussen 1 en 500 liggen'),
  query('skip').optional().isInt({ min: 0, max: 10000 }).withMessage('skip moet tussen 0 en 10000 liggen'),
];
const SUPPLIER_ACCOUNT_PATTERN = /^[a-zA-Z0-9._+-]{2,40}$/;
const BOARD_KEY_PATTERN = /^[a-z0-9-]{2,64}$/;
const MAX_COLUMNS = 80;

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

function getPool() {
  return sql.connect(process.env.SQL_CONNECTION_STRING);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
  )).slice(0, MAX_COLUMNS);
}

function normalizeBoardSettings(rawSettings) {
  const input = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
  return {
    visibleColumns: normalizeStringArray(input.visibleColumns),
    columnOrder: normalizeStringArray(input.columnOrder),
  };
}

router.get('/board-settings/:boardKey', async (req, res, next) => {
  try {
    const boardKey = String(req.params.boardKey || '').trim();
    if (!BOARD_KEY_PATTERN.test(boardKey)) {
      return res.status(400).json({ error: 'Ongeldige board key' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('boardKey', sql.NVarChar(64), boardKey)
      .query(`
        SELECT settings_json
        FROM dbo.user_board_settings
        WHERE user_id = @userId AND board_key = @boardKey
      `);

    if (!result.recordset.length) {
      return res.json({ boardKey, settings: null });
    }

    let parsedSettings = null;
    try {
      parsedSettings = JSON.parse(result.recordset[0].settings_json || '{}');
    } catch {
      parsedSettings = {};
    }

    return res.json({ boardKey, settings: normalizeBoardSettings(parsedSettings) });
  } catch (err) {
    return next(err);
  }
});

router.patch('/board-settings/:boardKey', async (req, res, next) => {
  try {
    const boardKey = String(req.params.boardKey || '').trim();
    if (!BOARD_KEY_PATTERN.test(boardKey)) {
      return res.status(400).json({ error: 'Ongeldige board key' });
    }

    const settings = normalizeBoardSettings(req.body?.settings);
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('boardKey', sql.NVarChar(64), boardKey)
      .input('settingsJson', sql.NVarChar(sql.MAX), JSON.stringify(settings))
      .query(`
        MERGE dbo.user_board_settings AS target
        USING (SELECT @userId AS user_id, @boardKey AS board_key) AS source
          ON target.user_id = source.user_id AND target.board_key = source.board_key
        WHEN MATCHED THEN
          UPDATE SET settings_json = @settingsJson, updated_at = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (user_id, board_key, settings_json, updated_at)
          VALUES (@userId, @boardKey, @settingsJson, SYSUTCDATETIME());
      `);

    return res.json({ success: true, boardKey, settings });
  } catch (err) {
    return next(err);
  }
});

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

    const fetchAll = req.query.all === true;
    const defaultTop = fetchAll ? '200' : '25';
    const top = Number.parseInt(req.query.top || defaultTop, 10);
    const skip = Number.parseInt(req.query.skip || '0', 10);
    const result = await fetchPurchaseOrders({ supplierAccount, top, skip, fetchAll });

    return res.json({
      supplierAccount: supplierAccount || null,
      scope: staffUser ? 'company' : 'supplier',
      meta: {
        top,
        skip,
        total: result.total,
        requestedAll: fetchAll,
        fetchedAll: result.fetchedAll,
        hasMore: result.hasMore,
        truncated: result.truncated,
        pagesFetched: result.pagesFetched,
      },
      purchaseOrders: result.items,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
