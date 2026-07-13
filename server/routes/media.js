'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireSession, requireAnyRole } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');
const { time } = require('../utils/timing');
const {
  createProductImageService,
  validateProductImageInput,
} = require('../services/ProductImageService');

const ALLOWED_QUERY_KEYS = new Set(['dataAreaId', 'itemNumber']);

function hasOnlyImageQueryParameters(query) {
  return Object.keys(query || {}).every((key) => ALLOWED_QUERY_KEYS.has(key));
}

function createGetProductImageHandler({ productImageService, timeFn = time }) {
  return async (req, res) => {
    const input = validateProductImageInput(req.query);
    if (!input || !hasOnlyImageQueryParameters(req.query)) {
      res.set('Cache-Control', 'no-store');
      return res.status(400).json({ error: 'Ongeldige productafbeeldingparameters' });
    }

    try {
      const image = await timeFn('product_image_d365', () => productImageService.getProductImage(input));
      if (!image) {
        res.set('Cache-Control', 'no-store');
        return res.status(204).end();
      }

      res.set('Cache-Control', 'private, max-age=900');
      return res.type(image.contentType).send(image.content);
    } catch {
      res.set('Cache-Control', 'no-store');
      return res.status(502).json({ error: 'Productafbeelding is tijdelijk niet beschikbaar' });
    }
  };
}

function createMediaRouter({
  productImageService = createProductImageService(),
  rateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  requireSessionFn = requireSession,
  requireAnyRoleFn = requireAnyRole,
  timeFn = time,
} = {}) {
  const router = express.Router();
  const staffOnly = requireAnyRoleFn([ROLES.ADMIN, ROLES.EMPLOYEE]);

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get(
    '/product-image',
    rateLimiter,
    requireSessionFn,
    staffOnly,
    createGetProductImageHandler({ productImageService, timeFn })
  );

  return router;
}

module.exports = {
  createGetProductImageHandler,
  createMediaRouter,
  hasOnlyImageQueryParameters,
};
