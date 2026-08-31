'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireNightRefreshToken } = require('../utils/nightRefreshToken');
const dataService = require('../services/TableDataService');
const refreshRunService = require('../services/RefreshRunService');
const nightRefreshWekkerAlert = require('../services/NightRefreshWekkerAlert');

const router = express.Router();

const limiterOptions = {
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts. Try again in one minute.' },
  standardHeaders: true,
  legacyHeaders: false,
};

const nightRefreshPostLimiter = rateLimit(limiterOptions);
const nightRefreshStartFailedLimiter = rateLimit(limiterOptions);

router.post('/', nightRefreshPostLimiter, requireNightRefreshToken, async (req, res, next) => {
  try {
    const result = await dataService.startRefresh('purchase-orders', { source: 'night' });
    if (result.attached) {
      return res.status(202).json({ attached: true, runId: result.runId });
    }
    return res.status(202).json({ attached: false, runId: result.runId, running: true });
  } catch (err) {
    return next(err);
  }
});

router.get('/status', requireNightRefreshToken, (_req, res) => {
  res.json(refreshRunService.getNightStatus());
});

router.post(
  '/start-failed',
  nightRefreshStartFailedLimiter,
  requireNightRefreshToken,
  nightRefreshWekkerAlert.handleStartFailed,
);

module.exports = router;
